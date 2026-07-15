const cookie = 'agroking_session={"id":"6a4fc69a5c268e53a4a14dd6","role":"Admin","name":"Admin"}';
fetch('http://localhost:3000/api/orders', {
  headers: {
    'Cookie': cookie
  }
}).then(r => r.json()).then(data => {
  console.log('Orders Count:', data.length);
  if(data.length > 0) {
    console.log('Sample order:', {
      farmer_name: data[0].farmer_name,
      phone: data[0].phone
    });
  }
}).catch(console.error);
