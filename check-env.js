// Diagnostic script to check environment variables
// Run with: node check-env.js

console.log('🔍 Checking AXIOM Environment Variables:\n');

const requiredVars = [
  'AXIOM_API_URL',
  'AXIOM_CLIENT_ID',
  'AXIOM_CLIENT_SECRET',
  'AXIOM_DCODE',
  'AXIOM_SUBUID',
  'AXIOM_PWD',
  'AXIOM_SENDER',
  'SUPABASE_SERVICE_ROLE_KEY',
];

let allSet = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const isSet = !!value;
  const display = isSet 
    ? (varName.includes('SECRET') || varName.includes('KEY') 
        ? `${value.substring(0, 10)}...` 
        : value)
    : '❌ NOT SET';
  
  console.log(`${isSet ? '✅' : '❌'} ${varName}: ${display}`);
  
  if (!isSet) allSet = false;
});

console.log('\n' + (allSet ? '✅ All variables are set!' : '❌ Missing required variables!'));

if (!allSet) {
  console.log('\n📝 Add missing variables to .env.local and rebuild.');
}

