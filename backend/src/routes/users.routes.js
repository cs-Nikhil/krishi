const express = require("express");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const filterObject = require("../utils/filterObject");
const httpError = require("../utils/httpError");
const { authenticate, authorize } = require("../middleware/auth");
const { sendSuccess } = require("../utils/apiResponse");

const router = express.Router();

router.use(authenticate, authorize("owner"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    sendSuccess(res, {
      message: "Users loaded",
      data: { users }
    });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = filterObject(req.body, ["name", "email", "phone", "password", "role", "active"]);

    if (!data.name || !data.email || !data.password) {
      throw httpError(400, "Name, email, and password are required");
    }

    const exists = await User.exists({ email: data.email.toLowerCase().trim() });
    if (exists) {
      throw httpError(409, "A user with this email already exists");
    }

    const user = new User({
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role || "staff",
      active: data.active !== false
    });

    await user.setPassword(data.password);
    await user.save();

    sendSuccess(res, {
      status: 201,
      message: "User created successfully",
      data: { user }
    });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select("+passwordHash");
    if (!user) {
      throw httpError(404, "User not found");
    }

    const before = user.toObject();
    const updates = filterObject(req.body, ["name", "email", "phone", "password", "role", "active"]);

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== "password") user[key] = value;
    });

    if (updates.password) {
      await user.setPassword(updates.password);
    }

    await user.save();
    await req.auditUpdate({ entityType: "user", entityId: user._id, before, after: user, ignoredFields: ["passwordHash"] });

    sendSuccess(res, {
      message: "User updated successfully",
      data: { user }
    });
  })
);

module.exports = router;
