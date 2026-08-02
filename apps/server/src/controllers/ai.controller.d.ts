import type { Request, Response } from 'express';
export declare const completeAiRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUsage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getConfig: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const ragQuery: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=ai.controller.d.ts.map
