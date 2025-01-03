const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: [true, "Ticket type is required"] 
  }, // e.g., "VIP", "Standard", "Early Bird"
  price: { 
    type: Number, 
    required: [true, "Ticket price is required"] 
  },
  quantity: { 
    type: Number, 
    required: [true, "Ticket quantity is required"] 
  }, // Total tickets of this type
  sold: { 
    type: Number, 
    default: 0 
  }, // Track tickets sold
});

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
    },
    category: {
      type: String,
      required: [true, "Event category is required"],
    },
    subcategory: {
      type: String,
      required: [true, "Event subcategory is required"],
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Event start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "Event end date is required"],
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    eventType: {
      type: String,
      enum: ["Online", "Physical"],
      required: [true, "Event type is required"],
    },
    eventLink: {
      type: String,
      required: function () {
        return this.eventType === "Online";
      },
    },
    location: {
      type: String,
      required: function () {
        return this.eventType === "Physical";
      },
    },
    city: {
      type: String,
      required: function () {
        return this.eventType === "Physical";
      },
    },
    address: {
      type: String,
      required: function () {
        return this.eventType === "Physical";
      },
    },
    images: {
      type: [String], // Array of image paths
      default: [],
    },
    ticketsAvailable: {
      type: Number,
      required: [true, "Total tickets available is required"],
      default: 0, // Total tickets available for the event
    },
    tickets: {
      type: [ticketSchema], // Array of ticket types
      validate: {
        validator: function (value) {
          return value.length > 0; // Ensure at least one ticket type exists
        },
        message: "At least one ticket type is required.",
      },
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Event organizer is required"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Event", eventSchema);
