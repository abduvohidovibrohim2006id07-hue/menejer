import { NextResponse } from 'next/server';

type ApiHandler = (req: Request, context?: any) => Promise<any>;

/**
 * Optimized API Gateway for 100% unified error handling, logging, and response format.
 */
export const withGateway = (handler: ApiHandler) => async (req: Request, context?: any): Promise<Response> => {
  const startTime = Date.now();
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  console.log(`[API GATEWAY] [${method}] ${path} - Starting...`);

  try {
    const result = await handler(req, context);
    
    // Performance logging
    const duration = Date.now() - startTime;
    console.log(`[API GATEWAY] [${method}] ${path} - Success in ${duration}ms`);

    // Ensure it's always a NextResponse
    if (result instanceof NextResponse) return result;
    
    return NextResponse.json(result);

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[API GATEWAY] [${method}] ${path} - Error after ${duration}ms:`, error.message);

    return NextResponse.json(
      { 
        error: error.message || 'Internal Server Error',
        status: 'error',
        timestamp: new Date().toISOString(),
        path 
      }, 
      { status: error.status || 500 }
    );
  }
};
