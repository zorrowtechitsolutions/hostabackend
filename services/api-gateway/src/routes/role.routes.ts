// import express from "express";
// import { proxyRequest } from "../services/role.service";

// const router = express.Router();

// router.use("/role", proxyRequest);
// router.use("/rolepermission", proxyRequest);
// router.use("/permission", proxyRequest);
// router.use("/check-permission", proxyRequest);

// export default router;
import express from "express";
import { proxyRequest } from "../services/role.service";

const router = express.Router();

router.use("/role", proxyRequest);
router.use("/rolepermission", proxyRequest);
router.use("/permission", proxyRequest);

export default router;