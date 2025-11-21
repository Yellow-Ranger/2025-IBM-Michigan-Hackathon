/**
 * Watsonx Connection Test Utility
 *
 * This module provides functions to test watsonx API connectivity
 * and can be used within the React Native app
 */

import Constants from 'expo-constants';

const WATSONX_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_WATSONX_API_KEY ||
                        process.env.EXPO_PUBLIC_WATSONX_API_KEY;
const WATSONX_PROJECT_ID = Constants.expoConfig?.extra?.EXPO_PUBLIC_WATSONX_PROJECT_ID ||
                           process.env.EXPO_PUBLIC_WATSONX_PROJECT_ID;
const WATSONX_API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_WATSONX_API_URL ||
                        process.env.EXPO_PUBLIC_WATSONX_API_URL;

export interface TestResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

export interface ConnectionTestResults {
  environmentVariables: TestResult;
  authentication: TestResult;
  foundationModels: TestResult;
  textGeneration: TestResult;
  overall: {
    success: boolean;
    passedTests: number;
    totalTests: number;
  };
}

/**
 * Validates that all required environment variables are set
 */
export function validateEnvironmentVariables(): TestResult {
  const requiredVars = {
    WATSONX_API_KEY,
    WATSONX_PROJECT_ID,
    WATSONX_API_URL,
  };

  const missing: string[] = [];

  for (const [name, value] of Object.entries(requiredVars)) {
    if (!value || value.trim() === '') {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    return {
      success: false,
      message: 'Missing required environment variables',
      details: { missing },
      error: `The following variables are not set: ${missing.join(', ')}`,
    };
  }

  return {
    success: true,
    message: 'All environment variables are properly configured',
    details: {
      apiUrl: WATSONX_API_URL,
      projectId: WATSONX_PROJECT_ID,
      apiKeySet: !!WATSONX_API_KEY,
    },
  };
}

/**
 * Gets an IBM Cloud IAM access token
 */
export async function getAccessToken(): Promise<string> {
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
    throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Tests authentication with IBM Cloud
 */
export async function testAuthentication(): Promise<TestResult> {
  try {
    const token = await getAccessToken();

    return {
      success: true,
      message: 'Successfully authenticated with IBM Cloud',
      details: {
        tokenObtained: !!token,
        tokenLength: token.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Authentication failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Tests the foundation models endpoint
 */
export async function testFoundationModels(accessToken: string): Promise<TestResult> {
  try {
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
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const modelCount = data.resources?.length || 0;

    return {
      success: true,
      message: `Successfully fetched foundation models`,
      details: {
        modelCount,
        models: data.resources?.slice(0, 10).map((m: any) => m.model_id) || [],
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to fetch foundation models',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Tests text generation with a simple prompt
 */
export async function testTextGeneration(accessToken: string): Promise<TestResult> {
  try {
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
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    return {
      success: true,
      message: 'Text generation successful',
      details: {
        modelId: data.model_id,
        generatedText: data.results?.[0]?.generated_text?.substring(0, 100),
        tokenCount: data.results?.[0]?.generated_token_count,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Text generation failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Runs all connection tests and returns comprehensive results
 */
export async function runAllTests(): Promise<ConnectionTestResults> {
  const results: ConnectionTestResults = {
    environmentVariables: { success: false, message: '' },
    authentication: { success: false, message: '' },
    foundationModels: { success: false, message: '' },
    textGeneration: { success: false, message: '' },
    overall: {
      success: false,
      passedTests: 0,
      totalTests: 4,
    },
  };

  // Test 1: Environment variables
  results.environmentVariables = validateEnvironmentVariables();
  if (!results.environmentVariables.success) {
    return results;
  }

  // Test 2: Authentication
  let accessToken: string | null = null;
  results.authentication = await testAuthentication();
  if (results.authentication.success) {
    try {
      accessToken = await getAccessToken();
    } catch (error) {
      // Already handled in testAuthentication
    }
  }

  if (!accessToken) {
    return results;
  }

  // Test 3: Foundation models
  results.foundationModels = await testFoundationModels(accessToken);

  // Test 4: Text generation
  results.textGeneration = await testTextGeneration(accessToken);

  // Calculate overall results
  const passedTests = [
    results.environmentVariables,
    results.authentication,
    results.foundationModels,
    results.textGeneration,
  ].filter(r => r.success).length;

  results.overall = {
    success: passedTests === results.overall.totalTests,
    passedTests,
    totalTests: results.overall.totalTests,
  };

  return results;
}

/**
 * Formats test results as a readable string
 */
export function formatTestResults(results: ConnectionTestResults): string {
  const lines: string[] = [];

  lines.push('=== Watsonx Connection Test Results ===\n');

  const formatResult = (name: string, result: TestResult) => {
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    lines.push(`${status} - ${name}`);
    lines.push(`  ${result.message}`);
    if (result.error) {
      lines.push(`  Error: ${result.error}`);
    }
    if (result.details) {
      lines.push(`  Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    lines.push('');
  };

  formatResult('Environment Variables', results.environmentVariables);
  formatResult('Authentication', results.authentication);
  formatResult('Foundation Models', results.foundationModels);
  formatResult('Text Generation', results.textGeneration);

  lines.push('=== Summary ===');
  lines.push(`Passed: ${results.overall.passedTests}/${results.overall.totalTests}`);
  lines.push(`Overall: ${results.overall.success ? 'SUCCESS' : 'FAILURE'}`);

  return lines.join('\n');
}
