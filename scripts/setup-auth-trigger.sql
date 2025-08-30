-- Supabase Auth와 Public 테이블 동기화를 위한 트리거 설정
-- auth.users와 public.users를 자동으로 동기화

-- 1. users 테이블에 필요한 컬럼이 있는지 확인
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Auth 사용자 생성 시 public.users에 자동 삽입하는 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'business_name', new.email),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 기존 트리거 삭제 (있는 경우)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. 새 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Auth 사용자 업데이트 시 public.users도 업데이트하는 함수
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.users
  SET 
    email = new.email,
    updated_at = now()
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 업데이트 트리거
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- 7. Auth 사용자 삭제 시 public.users도 삭제하는 함수
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.users WHERE id = old.id;
  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 삭제 트리거
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- 9. 기존 Auth 사용자들을 public.users에 동기화
INSERT INTO public.users (id, email, name, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'business_name', email),
  created_at,
  updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = now();

-- 10. 확인 쿼리
SELECT 
  'Auth Users' as source,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Public Users' as source,
  COUNT(*) as count
FROM public.users;