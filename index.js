const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://eventful-soirees.web.app",
      "https://eventful-soirees.web.app"
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v8mpgvp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//middleware
const logger = async(req,res,next)=>{
  console.log('called:', req.hostname, req.originalUrl)
  next();
}
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log('token in middleware', token)
  if (!token) {
      return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err)
          return res.status(401).send({ message: 'unauthorized access' })
      }
      console.log('docoded', decoded)
      req.user = decoded;
      next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const servicesCollection = client.db('eventsDB').collection('services');
    const bookingsCollection = client.db('eventsDB').collection('bookings');

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    };
    //jwt token generate
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);

      res.cookie("token", token, cookieOptions).send({ success: true });
    });
    
    //clearing Token
    app.get("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    //services related api
    app.get('/services', async(req,res)=>{
      const email = req.query.email;
      let query = {};
      if(email){
        query = {providerEmail: email}
      }
      const result = await servicesCollection.find(query).toArray();
      res.send(result); 
    })

    app.get('/services/:id', logger, verifyToken, async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await servicesCollection.findOne(query);
      res.send(result); 
    })

    app.post('/services', async(req,res)=>{
      const service = req.body;
      const result = await servicesCollection.insertOne(service);
      res.send(result); 
    })

    app.delete('/services/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await servicesCollection.deleteOne(query);
      res.send(result); 
    })
    
    app.put('/services/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const newService = req.body;
      const options = { upsert: true };
      const updateService = {
        $set: {
          serviceName: newService.serviceName,
          serviceArea: newService.serviceArea,
          imgURL: newService.imgURL,
          price: newService.price,
          description: newService.description
        },
      };
      const result = await servicesCollection.updateOne(filter, updateService, options);
      res.send(result); 
    })

    //pagination and search services api
   app.get('/all-services', async(req,res)=>{
    const search = req.query.search;
    const page = parseInt(req.query.page);
    let newpage=0;
    if(page===0){
     newpage = page;
    }else{
     newpage=page-1;
    }
    const size = parseInt(req.query.size);
 
    let query = {
      serviceName: { $regex: search, $options: 'i' },
    }
     const result = await servicesCollection.find(query)
    .skip(newpage*size)
    .limit(size)
    .toArray();
    res.send(result)
  })

  app.get('/servicecount', async (req, res) => {
    const search = req.query.search;
    let query = {
      serviceName: { $regex: search, $options: 'i' },
    }
    const count = await servicesCollection.countDocuments(query);
    res.send({count})
  })


    //Booking related api
    app.post('/bookings', logger, verifyToken, async(req,res)=>{
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result); 
    })

    app.get('/bookings', logger, verifyToken, async(req,res)=>{
      const email = req.query.email;
       const query = {userEmail: email}
      const result = await bookingsCollection.find(query).toArray();
      res.send(result); 
    })
    app.get('/booked', logger, verifyToken, async(req,res)=>{
      const email = req.query.email;
       const query = {providerEmail: email}
      const result = await bookingsCollection.find(query).toArray();
      res.send(result); 
    })

    app.patch('/bookings/:id', logger, verifyToken, async (req, res) => {
      const id = req.params.id
      const status = req.body
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: status,
      }
      const result = await bookingsCollection.updateOne(query, updateDoc)
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Eventful Soirees server is running')
})

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`)
})