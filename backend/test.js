async function test() {
  try {
    const regRes = await fetch('http://127.0.0.1:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testu_11223344',
        password: 'password123'
      })
    });
    const regData = await regRes.json();
    console.log('Registered', regData.token);
    
    const token = regData.token;
    const chatRes = await fetch('http://127.0.0.1:5000/api/chat', {
       method: 'POST',
       headers: { 
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
       },
       body: JSON.stringify({ message: 'Hello' })
    });
    const chatData = await chatRes.json();
    console.log('Chat response:', chatRes.status, JSON.stringify(chatData, null, 2));
  } catch (err) {
    console.error(err.message);
  }
}

test();
