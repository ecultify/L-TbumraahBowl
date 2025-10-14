'use client';

export function UnauthorizedAccess() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000',
      color: '#fff',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '72px', marginBottom: '20px', fontWeight: 'bold' }}>404</h1>
      <h2 style={{ fontSize: '24px', marginBottom: '20px', fontWeight: '600' }}>Page Not Found</h2>
      <p style={{ fontSize: '16px', marginBottom: '30px', maxWidth: '500px' }}>
        The page you are looking for does not exist or you do not have access to it.
      </p>
      <a 
        href="/"
        style={{
          backgroundColor: '#FDC217',
          color: '#000',
          padding: '12px 24px',
          borderRadius: '25px',
          textDecoration: 'none',
          fontWeight: '700',
          display: 'inline-block'
        }}
      >
        Go to Homepage
      </a>
    </div>
  );
}

