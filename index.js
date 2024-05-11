const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: ["http://localhost:5173"]
}))
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v8mpgvp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const servicesCollection = client.db('eventsDB').collection('services');
    const bookingsCollection = client.db('eventsDB').collection('bookings');

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

    app.get('/services/:id', async(req,res)=>{
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

    //Booking related api
    app.post('/bookings', async(req,res)=>{
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result); 
    })

    app.get('/bookings', async(req,res)=>{
      const email = req.query.email;
       const query = {userEmail: email}
      const result = await bookingsCollection.find(query).toArray();
      res.send(result); 
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