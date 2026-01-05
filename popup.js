document.querySelectorAll('.link-btn').forEach(button => {
  button.addEventListener('click', () => {
    const textToCopy = button.getAttribute('data-url');
    
    // Use the Clipboard API
    navigator.clipboard.writeText(textToCopy).then(() => {
      const status = document.getElementById('status');
      status.textContent = 'Copied to clipboard!';
      
      // Clear the message after 2 seconds
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  });
});