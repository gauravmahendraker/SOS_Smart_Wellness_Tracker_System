import cloudinary from "cloudinary";
import streamifier from "streamifier";

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


export const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const resourceType = file.mimetype === "application/pdf" ? "raw" : "auto";

        const stream = cloudinary.v2.uploader.upload_stream(
            { resource_type: resourceType },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );

        streamifier.createReadStream(file.buffer).pipe(stream);
    });
};