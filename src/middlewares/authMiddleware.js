export const ensureAuthenticated = ( req, res, next)=>{
    if( req.isAuthenticated() ){
        return next();
    }
    res.status(401).json({error:'User not authenticated'});
}

export const ensureRole = (role)=>{
    return (req, res, next)=>{
        if( req.isAuthenticated() && req.user.role == role ){
            return next();
        }
        res.status(403).json({error: 'User access denied'});
    }
}