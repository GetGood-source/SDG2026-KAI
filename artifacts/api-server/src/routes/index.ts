import { Router, type IRouter } from "express";
import healthRouter from "./health";
import procurementRouter from "./procurement";
import accountsRouter from "./accounts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accountsRouter);
router.use(procurementRouter);

export default router;
