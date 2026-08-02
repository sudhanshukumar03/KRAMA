import type { Request, Response } from 'express';
export declare const listSprints: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSprint: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createSprint: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateSprint: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteSprint: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSprintTasks: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=sprint.controller.d.ts.map
