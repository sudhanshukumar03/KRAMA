import type { Request, Response } from 'express';
export declare const listHabits: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getHabit: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createHabit: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateHabit: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteHabit: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const logHabit: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=habit.controller.d.ts.map