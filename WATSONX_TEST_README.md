# Watsonx Connection Testing

This project includes two ways to test your IBM watsonx API connection.

## Quick Start

Run the standalone test script:

```bash
npm run test:watsonx
```

This will validate your connection and run comprehensive tests against the watsonx API.

## Test Files

### 1. Standalone Node.js Test Script

**File:** [test-watsonx-connection.js](test-watsonx-connection.js)

A comprehensive standalone script that tests all aspects of your watsonx connection.

**Usage:**
```bash
npm run test:watsonx
```

**What it tests:**
- ✓ Environment variable validation
- ✓ IBM Cloud IAM authentication
- ✓ Foundation models endpoint access
- ✓ Text generation functionality

**Output:** Color-coded terminal output showing detailed test results for each step.

### 2. TypeScript Utility Module

**File:** [utils/watsonxTest.ts](utils/watsonxTest.ts)

A TypeScript module that can be imported and used within your React Native app for runtime testing.

**Usage in your app:**

```typescript
import { runAllTests, formatTestResults } from '@/utils/watsonxTest';

// Run all tests
const results = await runAllTests();
console.log(formatTestResults(results));

// Or run individual tests
import {
  validateEnvironmentVariables,
  testAuthentication,
  testFoundationModels,
  testTextGeneration
} from '@/utils/watsonxTest';

const envCheck = validateEnvironmentVariables();
if (envCheck.success) {
  const authResult = await testAuthentication();
  console.log(authResult.message);
}
```

## Test Results

The test script validates:

1. **Environment Variables**
   - Checks that all required variables are set in `.env`
   - Variables: `EXPO_PUBLIC_WATSONX_API_KEY`, `EXPO_PUBLIC_WATSONX_PROJECT_ID`, `EXPO_PUBLIC_WATSONX_API_URL`

2. **Authentication**
   - Obtains an IBM Cloud IAM access token
   - Verifies API key is valid

3. **Foundation Models**
   - Lists available models from watsonx
   - Confirms API endpoint is accessible

4. **Text Generation**
   - Sends a test prompt to the API
   - Verifies response is received successfully

## Available Models

Your watsonx instance has access to 27 foundation models including:

- `ibm/granite-3-8b-instruct` - General purpose instruction model
- `ibm/granite-3-2-8b-instruct` - Optimized instruction model
- `ibm/granite-8b-code-instruct` - Code-specific model
- `ibm/granite-guardian-3-8b` - Safety-focused model
- `cross-encoder/ms-marco-minilm-l-12-v2` - Embedding model
- And 22 more models...

## Troubleshooting

### Test Fails at Authentication
- Verify your `EXPO_PUBLIC_WATSONX_API_KEY` is correct
- Check that the API key has proper permissions
- Ensure you have network connectivity to `iam.cloud.ibm.com`

### Test Fails at Foundation Models
- Verify your `EXPO_PUBLIC_WATSONX_API_URL` is correct
- Check that the access token has permissions to access the ML service

### Test Fails at Text Generation
- Verify your `EXPO_PUBLIC_WATSONX_PROJECT_ID` is correct
- Ensure the project exists and is accessible
- Check that the model ID is available in your instance

## Environment Variables

Make sure your `.env` file contains:

```env
EXPO_PUBLIC_WATSONX_API_KEY=your_api_key_here
EXPO_PUBLIC_WATSONX_PROJECT_ID=your_project_id_here
EXPO_PUBLIC_WATSONX_API_URL=https://us-south.ml.cloud.ibm.com
```

## API Documentation

- [IBM watsonx.ai API Documentation](https://cloud.ibm.com/apidocs/watsonx-ai)
- [Foundation Models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models.html)
