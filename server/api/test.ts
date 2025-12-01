// Simple test endpoint to verify Vercel serverless works
export default async function handler(req: any, res: any) {
  res.status(200).json({
    success: true,
    message: 'Test endpoint works!',
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
}
