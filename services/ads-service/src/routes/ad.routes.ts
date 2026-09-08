import { Router } from "express";
import {
  createAd,
  getAds,
  getSingleAd,
  updateAd,
  deleteAd,
} from "../controllers/ad.controller";
import { authenticate } from "../middleware/authenticate";
import { checkPermission } from "../middleware/role.middleware";

const router = Router();

router.post("/ads",  createAd);
router.get("/ads",  getAds);
router.get("/ads/:id",  getSingleAd);
router.put("/ads/:id",  updateAd);
router.delete("/ads/:id",  deleteAd);

export default router;
