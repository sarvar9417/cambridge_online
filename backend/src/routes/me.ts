import { Router } from 'express';
import { updateProfileSchema } from '../lib/auth-schemas.js';
import type { AuthService } from '../services/auth-service.js';

export function createMeRouter(auth:AuthService) {
  const router=Router();

  router.get('/', (req, res) => {
    res.json({ user: req.actor });
  });

  router.patch('/',async(req,res)=>{
    const input=updateProfileSchema.parse(req.body);
    res.json({user:await auth.updateProfile(req.actor!.id,input)});
  });

  return router;
}
