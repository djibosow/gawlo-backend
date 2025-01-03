const express = require("express"); // Ensure this is declared only once
const {
  submitRefundRequest,
  approveRefund,
  getAllRefunds, // Import the new controller function
} = require("../controllers/refundController");

const router = express.Router();

// Fetch all refunds (Admin)
router.get("/", getAllRefunds);

// Submit a refund request
router.post("/", submitRefundRequest);

// Approve or reject a refund
router.put("/:id", approveRefund);

module.exports = router;
