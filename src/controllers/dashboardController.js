export const getDoctor = async (req, res)=>{
    const doctor = await req.user;
    res.json({mesage:'Welcome Doctor', user:doctor});
}

export const getPatient = async (req, res)=>{
    const patient = await req.user;
    res.json({mesage:'Welcome Patient', user:patient});
}