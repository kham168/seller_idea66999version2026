import { Request, Response } from "express";

function test(req: Request, res: Response) {
  const data = { message: "This is test endpoint" };
  return res.json(data);
}

export { test };
