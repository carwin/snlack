// @TODO - This is a stub. It might be nice to have an endpoint for Slack's dynamic select element options.
import { NextFunction, Request, Response, Router } from 'express';
import { Controller } from '../../types';

export class OrgProjectOptionsController implements Controller {
  public path = '/org/project/options';
  public router = Router();
  constructor() {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.get(`${this.path}`, this.routeHandler);
  }

  private routeHandler(req: Request, res: Response, next: NextFunction) {
    res.sendStatus(200);
  }
}
