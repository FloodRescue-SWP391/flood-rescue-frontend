export const uploadToCloudinary = async(file) =>{
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "flood_rescue_upload");

    const res = await fetch(
        "https://api.cloudinary.com/v1_1/dmgwmyppe/image/upload",
        {
            method: "POST",
            body: formData,
        }
    );

    if (!res.ok) throw new Error("Upload File");

    return await res.json();  // tra ve url, public_id
}