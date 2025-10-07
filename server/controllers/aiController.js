import  OpenAI  from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';



import FormData from "form-data";

const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});
export const generateArticle = async (req,res) =>{
    try {
        const{userId} =req.auth();
        const{prompt,length} =req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if(plan !== 'premium' && free_usage>=10){
            return res.json({success:false, message: " limit reached. Upgrade to premium"})
        }
        const response = await AI.chat.completions.create({
    model: "gemini-2.0-flash",
    messages: [
        
        {
            role: "user",
            content: prompt,
        },
    ],
    temperature: 0.7,
    max_tokens: length,
});
const content = response.choices[0].message.content;

await sql `INSERT INTO creations (user_id,prompt,content,type) VALUES (${userId},${prompt},${content} ,'article')`;

if(plan !== 'premium'){
    await clerkClient.users.updateUserMetadata(userId,{
        privateMetadata:{
            free_usage: free_usage +1
        }
    })
}
res.json({success:true,content})
    } catch (error) {
        console.log(error.message)
        res.json({success:false,message:error.message})
    }
}
export const generateBlogTitle = async (req,res) =>{
    try {
        const{userId} =req.auth();
        const{prompt} =req.body;
        const plan = req.plan;
        const free_usage = req.free_usage;

        if(plan !== 'premium' && free_usage>=10){
            return res.json({success:false, message: " limit reached. Upgrade to premium"})
        }
        const response = await AI.chat.completions.create({
    model: "gemini-2.0-flash",
    messages: [
        
        {
            role: "user",
            content: prompt,
        },
    ],
    temperature: 0.7,
    max_tokens: 100,
});
const content = response.choices[0].message.content;

await sql `INSERT INTO creations (user_id,prompt,content,type) VALUES (${userId},${prompt},${content} ,'blog-title')`;

if(plan !== 'premium'){
    await clerkClient.users.updateUserMetadata(userId,{
        privateMetadata:{
            free_usage: free_usage +1
        }
    })
}
res.json({success:true,content})
    } catch (error) {
        console.log(error.message)
        res.json({success:false,message:error.message})
    }
}

export const generateImage = async (req,res) =>{
    try {
        const{userId} =req.auth();
        const{prompt,publish} =req.body;
        const plan = req.plan;
        

        if(plan !== 'premium' ){
            return res.json({success:false, message: "  Upgrade to premium"})
        }
        
        const formData = new FormData()
formData.append('prompt', prompt)

const{data} = await axios.post('https://clipdrop-api.co/text-to-image/v1', formData,{

headers: {
'x-api-key': process.env.CLIPDROP_API_KEY,
},
responseType: 'arraybuffer',

})
const base64Image = `data:image/png;base64,${Buffer.from(data, 'binary').toString('base64')}`;
const {secure_url} = await cloudinary.uploader.upload(base64Image)
await sql `INSERT INTO creations (user_id,prompt,content,type,publish) VALUES (${userId},${prompt},${secure_url} ,'image',${publish ?? false})`;


res.json({success:true,content:secure_url})
    } catch (error) {
        console.log(error.message)
        res.json({success:false,message:error.message})
    }
}
export const removeImageBackground = async (req,res) =>{
    try {
        const{userId} =req.auth();
        const image =req.file;
        const plan = req.plan;
        

        if(plan !== 'premium' ){
            return res.json({success:false, message: "  Upgrade to premium"})
        }
        
       


const {secure_url} = await cloudinary.uploader.upload(image.path,{
    transformation:[
        {effect:'background_removal',
            background_removal:'remove_the_background'
        }
    ]
})
await sql `INSERT INTO creations (user_id,prompt,content,type) VALUES (${userId},'Remove background from image',${secure_url} ,'image')`;


res.json({success:true,content:secure_url})
    } catch (error) {
        console.log(error.message)
        res.json({success:false,message:error.message})
    }
}

export const removeImageObject = async (req,res) => {
  try {
    const { userId } = req.auth();
    const { object } = req.body;
    const image = req.file;
    const plan = req.plan;

    if (plan !== 'premium') {
      return res.json({ success: false, message: "Upgrade to premium" });
    }

    // Upload original image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(image.path);

    // Apply AI object removal transformation
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      transformation: [{ effect: `gen_remove:${object}` }],
      resource_type: 'image'
    });

    // Save in database
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${`Remove ${object} from image`}, ${transformedUrl}, 'image')
    `;

    // Return the processed image URL
    res.json({ success: true, content: transformedUrl });

  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};






import multer from "multer";

// Use memory storage for Multer to avoid saving to disk
const upload = multer({ storage: multer.memoryStorage() });

export const resumeReview = [
  upload.single("resume"),
  async (req, res) => {
    try {
      const { userId } = req.auth();
      const plan = req.plan;

      if (plan !== "premium") {
        return res.json({ success: false, message: "Upgrade to premium" });
      }

      if (!req.file || req.file.mimetype !== "application/pdf") {
        return res.json({ success: false, message: "Invalid or missing PDF file." });
      }
      if (req.file.size > 5 * 1024 * 1024) {
        return res.json({ success: false, message: "File too large" });
      }

      // Convert PDF buffer to base64
      const pdfBase64 = req.file.buffer.toString("base64");

      // Generate prompt for AI
      const prompt = `
This is a resume in PDF format, base64 encoded below:
[PDF Base64 Start]
${pdfBase64}
[PDF Base64 End]

Extract key information (education, skills, experience) and suggest resume improvements for tech jobs.
      `;

      const response = await AI.chat.completions.create({
        model: "gemini-2.0-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1200,
      });

      const content = response.choices[0].message.content;

      await sql`
        INSERT INTO creations (user_id, prompt, content, type)
        VALUES (${userId}, 'review the resume (base64)', ${content}, 'resume-review')
      `;

      res.json({ success: true, content });
    } catch (error) {
      console.error(error);
      res.json({ success: false, message: error.message });
    }
  }
];
