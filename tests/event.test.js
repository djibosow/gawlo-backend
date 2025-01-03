const request = require("supertest");
const app = require("../src/server");
const User = require("../src/models/User");
const Event = require("../src/models/Event");

describe("Event Routes", () => {
  let accessToken;

  beforeAll(async () => {
    // Ensure a test user exists
    const user = await User.create({
      name: "Test User",
      email: "testuser@example.com",
      phone: "1234567890",
      password: await User.hashPassword("Password123!"), // Adjust this if your User model has a hashing function
      roles: ["buyer"],
    });

    // Login to get access token
    const loginRes = await request(app).post("/api/users/login").send({
      emailOrPhone: "testuser@example.com",
      password: "Password123!",
      role: "buyer",
    });

    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteOne({ email: "testuser@example.com" });
    await Event.deleteMany({ title: "Test Event" });
  });

  it("should fetch events with pagination", async () => {
    const res = await request(app).get("/api/events").query({ page: 1, limit: 10 });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("events");
    expect(res.body.pagination).toHaveProperty("currentPage", 1);
  });

  it("should create a new event", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${accessToken}`)
      .field("title", "Test Event")
      .field("category", "Music")
      .field("subcategory", "Concerts")
      .field("description", "This is a test event")
      .field("startDate", "2024-01-01T10:00:00Z")
      .field("endDate", "2024-01-01T12:00:00Z")
      .field("isFree", "true")
      .field("eventType", "Online")
      .field("eventLink", "https://testevent.com");

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("title", "Test Event");
  });

  it("should fail to create an event without authorization", async () => {
    const res = await request(app)
      .post("/api/events")
      .send({
        title: "Unauthorized Event",
        category: "Music",
        subcategory: "Concerts",
        description: "This should fail",
        startDate: "2024-01-01T10:00:00Z",
        endDate: "2024-01-01T12:00:00Z",
        isFree: "true",
        eventType: "Online",
        eventLink: "https://unauthorized.com",
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toContain("Authorization header is missing.");
  });
});
