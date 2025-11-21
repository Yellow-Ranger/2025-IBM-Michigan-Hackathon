#!/usr/bin/env node

/**
 * Watsonx Connection Test Script
 *
 * This script tests the connection to IBM watsonx API
 * Run with: node test-watsonx-connection.js
 */

require('dotenv').config();

const WATSONX_API_KEY = process.env.EXPO_PUBLIC_WATSONX_API_KEY;
const WATSONX_PROJECT_ID = process.env.EXPO_PUBLIC_WATSONX_PROJECT_ID;
const WATSONX_API_URL = process.env.EXPO_PUBLIC_WATSONX_API_URL;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
}

async function getAccessToken() {
  log('Obtaining IBM Cloud IAM access token...', colors.blue);

  const response = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${WATSONX_API_KEY}`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();
  log('✓ Access token obtained successfully', colors.green);
  return data.access_token;
}

async function testFoundationModels(accessToken) {
  log('Testing foundation models endpoint...', colors.blue);

  const response = await fetch(
    `${WATSONX_API_URL}/ml/v1/foundation_model_specs?version=2024-01-01`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch foundation models: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();
  log('✓ Foundation models endpoint accessible', colors.green);
  log(`  Found ${data.resources?.length || 0} available models`, colors.cyan);

  return data.resources || [];
}

async function testTextGeneration(accessToken) {
  log('Testing text generation endpoint...', colors.blue);

  const testPayload = {
    input: 'Hello, this is a test message to verify the connection.',
    model_id: 'ibm/granite-3-8b-instruct',
    project_id: WATSONX_PROJECT_ID,
    parameters: {
      max_new_tokens: 50,
      temperature: 0.7,
    },
  };

  const response = await fetch(
    `${WATSONX_API_URL}/ml/v1/text/generation?version=2024-01-01`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(testPayload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Text generation test failed: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();
  log('✓ Text generation successful', colors.green);
  log(`  Model used: ${data.model_id}`, colors.cyan);
  log(`  Generated text: "${data.results?.[0]?.generated_text?.substring(0, 100)}..."`, colors.cyan);

  return data;
}

async function validateEnvironmentVariables() {
  logSection('Step 1: Validating Environment Variables');

  const requiredVars = {
    'EXPO_PUBLIC_WATSONX_API_KEY': WATSONX_API_KEY,
    'EXPO_PUBLIC_WATSONX_PROJECT_ID': WATSONX_PROJECT_ID,
    'EXPO_PUBLIC_WATSONX_API_URL': WATSONX_API_URL,
  };

  let allValid = true;

  for (const [name, value] of Object.entries(requiredVars)) {
    if (!value || value.trim() === '') {
      log(`✗ ${name} is missing or empty`, colors.red);
      allValid = false;
    } else {
      log(`✓ ${name} is set`, colors.green);
      // Show masked value for API key
      if (name.includes('API_KEY')) {
        log(`  Value: ${value.substring(0, 8)}...${value.substring(value.length - 4)}`, colors.yellow);
      } else {
        log(`  Value: ${value}`, colors.yellow);
      }
    }
  }

  if (!allValid) {
    throw new Error('Missing required environment variables. Please check your .env file.');
  }

  log('\n✓ All required environment variables are set', colors.green);
}

async function main() {
  console.clear();
  log('╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║         IBM watsonx Connection Test Script               ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);

  try {
    // Step 1: Validate environment variables
    await validateEnvironmentVariables();

    // Step 2: Get access token
    logSection('Step 2: Authenticating with IBM Cloud');
    const accessToken = await getAccessToken();

    // Step 3: Test foundation models endpoint
    logSection('Step 3: Testing Foundation Models Endpoint');
    const models = await testFoundationModels(accessToken);

    if (models.length > 0) {
      log('\nAvailable models (first 10):', colors.cyan);
      models.slice(0, 10).forEach((model, index) => {
        log(`  ${index + 1}. ${model.model_id}`, colors.yellow);
      });
    }

    // Step 4: Test text generation
    logSection('Step 4: Testing Text Generation');
    await testTextGeneration(accessToken);

    // Summary
    logSection('Test Summary');
    log('✓ All tests passed successfully!', colors.green);
    log('✓ Your watsonx connection is working correctly', colors.green);
    log('\nYou can now use these credentials in your application.', colors.cyan);

  } catch (error) {
    logSection('Test Failed');
    log('✗ Error occurred during testing:', colors.red);
    log(error.message, colors.red);

    if (error.stack) {
      log('\nStack trace:', colors.yellow);
      log(error.stack, colors.yellow);
    }

    process.exit(1);
  }
}

// Run the test
main();
