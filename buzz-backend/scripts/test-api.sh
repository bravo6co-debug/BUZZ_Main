#!/bin/bash

# API Testing Script
# This script tests the basic API endpoints

set -e

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

echo "🧪 Testing Buzz Backend API..."
echo "Base URL: $BASE_URL"

# Test 1: Health Check
echo ""
echo "1️⃣ Testing Health Check..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    echo "Response: $HEALTH_RESPONSE"
fi

# Test 2: API Health Check
echo ""
echo "2️⃣ Testing API Health Check..."
API_HEALTH_RESPONSE=$(curl -s "$API_URL/health")
if echo "$API_HEALTH_RESPONSE" | grep -q '"success":true'; then
    echo "✅ API health check passed"
else
    echo "❌ API health check failed"
    echo "Response: $API_HEALTH_RESPONSE"
fi

# Test 3: Business List (Public)
echo ""
echo "3️⃣ Testing Business List..."
BUSINESS_RESPONSE=$(curl -s "$API_URL/businesses")
if echo "$BUSINESS_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Business list endpoint working"
else
    echo "❌ Business list endpoint failed"
    echo "Response: $BUSINESS_RESPONSE"
fi

# Test 4: Authentication Required Endpoint
echo ""
echo "4️⃣ Testing Authentication Required Endpoint..."
AUTH_RESPONSE=$(curl -s "$API_URL/auth/me")
if echo "$AUTH_RESPONSE" | grep -q '"code":"AUTH_001"'; then
    echo "✅ Authentication protection working"
else
    echo "⚠️ Authentication protection may not be working properly"
    echo "Response: $AUTH_RESPONSE"
fi

# Test 5: Admin Dashboard (Should require auth)
echo ""
echo "5️⃣ Testing Admin Dashboard..."
ADMIN_RESPONSE=$(curl -s "$API_URL/admin/dashboard")
if echo "$ADMIN_RESPONSE" | grep -q '"code":"AUTH_001"'; then
    echo "✅ Admin authentication protection working"
else
    echo "⚠️ Admin authentication protection may not be working properly"
    echo "Response: $ADMIN_RESPONSE"
fi

# Test 6: Invalid Endpoint (404 handling)
echo ""
echo "6️⃣ Testing 404 Handling..."
NOT_FOUND_RESPONSE=$(curl -s "$API_URL/invalid-endpoint")
if echo "$NOT_FOUND_RESPONSE" | grep -q '"success":false'; then
    echo "✅ 404 error handling working"
else
    echo "⚠️ 404 error handling may not be working properly"
    echo "Response: $NOT_FOUND_RESPONSE"
fi

# Test 7: Rate Limiting (if enabled)
echo ""
echo "7️⃣ Testing Rate Limiting..."
echo "Making multiple requests quickly..."
for i in {1..5}; do
    curl -s "$API_URL/businesses" > /dev/null
done
RATE_LIMIT_RESPONSE=$(curl -s "$API_URL/businesses")
if echo "$RATE_LIMIT_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Normal rate limiting behavior"
else
    echo "⚠️ Potential rate limiting issue or server error"
    echo "Response: $RATE_LIMIT_RESPONSE"
fi

echo ""
echo "🎉 API testing completed!"
echo ""
echo "💡 To test authenticated endpoints, you need to:"
echo "1. Register or login to get a JWT token"
echo "2. Use the token in Authorization header:"
echo "   curl -H 'Authorization: Bearer YOUR_TOKEN' $API_URL/auth/me"
echo ""