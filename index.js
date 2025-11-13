const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
require("dotenv").config();
const serviceAccount = require("./serviceKey.json");
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("my server is runnig funally...");
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.qr2egdp.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyIdToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({
      message: "unauthorized access.",
    });
  }

  const token = authorization.split(" ")[1];

  try {
    await admin.auth().verifyIdToken(token);
    next();
  } catch (error) {
    res.status(401).send({
      message: "unauthorized access.",
    });
  }
};

async function run() {
  try {
    // await client.connect();

    const db = client.db("social_development_platform");
    const eventCollection = db.collection("events");
    const joinEventCollection = db.collection("join_event");

    app.get("/events", async (req, res) => {
      const result = await eventCollection.find().toArray();
      res.send(result);
    });
    app.get("/events/byemail/:email", verifyIdToken, async (req, res) => {
      const email = req.params.email;
      const result = await eventCollection.find({ createdBy: email }).toArray();
      res.send(result);
    });

    app.get("/events/:id", async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);
      const result = await eventCollection.findOne({ _id: objectId });
      res.send(result);
    });

    app.get("/join_event/:email", verifyIdToken, async (req, res) => {
      const email = req.params.email;
      const result = await joinEventCollection
        .find({ userEmail: email })
        .toArray();
      res.send(result);
    });

    app.post("/events", async (req, res) => {
      const eventData = req.body;
      const result = await eventCollection.insertOne(eventData);
      res.send(result);
    });

    app.post("/join_event", async (req, res) => {
      const joinEventData = req.body;
      const result = await joinEventCollection.insertOne(joinEventData);
      res.send(result);
    });

    app.put("/events/:id",verifyIdToken, async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const objectId = new ObjectId(id);
      const filter = { _id: objectId };
      const update = {
        $set: data,
      };
      const result = await eventCollection.updateOne(filter, update);
      res.send(result);
    });

//   app.put("/events/:id", verifyIdToken, async (req, res) => {
//   const { id } = req.params;
//   const data = req.body;
//   const objectId = new ObjectId(id);

//   try {
//     // 1️⃣ Update the main event
//     const result = await eventCollection.updateOne(
//       { _id: objectId },
//       { $set: data }
//     );

//     if (result.matchedCount === 0) {
//       return res.status(404).send({ success: false, message: "Event not found" });
//     }

//     // 2️⃣ Update all join_event entries that reference this event
//     // Ensure eventId is stored as string in join_event for matching
//     await joinEventCollection.updateMany(
//       { eventId: id }, // match eventId as string
//       {
//         $set: {
//           title: data.title,
//           description: data.description,
//           eventType: data.eventType,
//           thumbnail: data.thumbnail,
//           location: data.location,
//           eventDate: data.eventDate,
//         },
//       }
//     );

//     res.send({ success: true, message: "Event updated successfully" });
//   } catch (error) {
//     console.error("Update error:", error);
//     res.status(500).send({ success: false, message: "Failed to update event" });
//   }
// });


    app.delete("/events/:id", verifyIdToken, async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);

      try {
        const result = await eventCollection.deleteOne({ _id: objectId });

        if (result.deletedCount === 1) {
          res.send({ success: true, message: "Event deleted successfully" });
        } else {
          res.status(404).send({ success: false, message: "Event not found" });
        }
      } catch (error) {
        console.error("Delete error:", error);
        res
          .status(500)
          .send({ success: false, message: "Failed to delete event" });
      }
    });

    app.get("/search", async (req, res) => {
      try {
        const search_text = req.query.search;

        if (!search_text || typeof search_text !== "string") {
          return res.status(400).json({
            success: false,
            message:
              "Please provide a valid 'search' query parameter (e.g., ?search=tech)",
          });
        }

        const result = await eventCollection
          .find({ title: { $regex: search_text, $options: "i" } })
          .toArray();

        res.json({ success: true, data: result });
      } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({
          success: false,
          message: "Search failed",
          error: error.message,
        });
      }
    });

    app.get("/filter", async (req, res) => {
      try {
        const eventType = req.query.eventType;

        if (!eventType || typeof eventType !== "string") {
          return res.status(400).json({
            success: false,
            message:
              "Please provide a valid 'eventType' query parameter (e.g., ?eventType=workshop)",
          });
        }

        const result = await eventCollection
          .find({ eventType: { $regex: eventType, $options: "i" } })
          .toArray();

        res.json({ success: true, data: result });
      } catch (error) {
        console.error("Filter error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to filter events",
          error: error.message,
        });
      }
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`server is on listening on port ${port}`);
});
