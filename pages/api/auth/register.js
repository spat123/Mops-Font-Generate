import { createCredentialsUser } from '../../../lib/auth/userStore';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { name, email, password } = req.body || {};
    await createCredentialsUser({ name, email, password });
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e?.code === 'EXISTS') {
      res.status(409).json({ error: 'User already exists' });
      return;
    }
    if (e?.code === 'VALIDATION') {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    res.status(500).json({ error: 'Internal error' });
  }
}

