import type { Request, Response } from 'express';
export declare const listPages: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createPage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deletePage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const restorePage: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=page.controller.d.ts.map
