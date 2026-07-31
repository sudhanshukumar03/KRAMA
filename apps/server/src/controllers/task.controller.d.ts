import type { Request, Response } from 'express';
export declare const listTasks: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const reorderTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const completeTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=task.controller.d.ts.map