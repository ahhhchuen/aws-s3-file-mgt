const uploadButton = document.getElementById('uploadButton');
const fileInput = document.getElementById('fileInput');
const messageDiv = document.getElementById('message');
const fileList = document.getElementById('fileList');
const uploadSpinner = document.getElementById('uploadSpinner');

function showSpinner(show) {
    uploadSpinner.style.display = show ? 'block' : 'none';
    if (show) {
        messageDiv.innerText = ''; // Clear previous message when showing spinner
    }
}

uploadButton.addEventListener('click', async () => {
    const files = fileInput.files;
    if (files.length === 0) {
        messageDiv.innerText = "Please select at least one file to upload.";
        return;
    }

    messageDiv.innerText = '';
    showSpinner(true);

    const formData = new FormData();
    Array.from(files).forEach(file => {
        formData.append('files', file);
    });

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        showSpinner(false);

        let message = result.message;
        if (result.errors) {
            message += ' Errors: ' + result.errors.join('; ');
        }
        messageDiv.innerText = message;

        loadFiles();
    } catch (error) {
        showSpinner(false);
        messageDiv.innerText = 'Error uploading files: ' + error.message;
    }
});

function deleteFile(fileName) {
    showSpinner(true);
    fetch('/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename: fileName })
    })
    .then(response => response.json())
    .then(data => {
        showSpinner(false);
        if (data.error) {
            messageDiv.innerText = `Error deleting ${fileName}: ${data.error}`;
        } else {
            messageDiv.innerText = data.message;
            loadFiles();
        }
    })
    .catch(error => {
        showSpinner(false);
        messageDiv.innerText = `Error deleting ${fileName}: ${error.message}`;
    });
}

function downloadFile(fileName) {
    showSpinner(true);
    messageDiv.innerText = `${fileName} is being downloaded ...`; // Set downloading message after spinner
    fetch('/download', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename: fileName })
    })
    .then(response => response.json())
    .then(async data => {
        if (data.error) {
            showSpinner(false);
            messageDiv.innerText = `Error: ${data.error}`;
            return;
        }

        try {
            // Fetch the file from the signed URL
            const fileResponse = await fetch(data.url);
            if (!fileResponse.ok) {
                throw new Error(`HTTP error! Status: ${fileResponse.status}`);
            }

            // Get the file as a blob
            const blob = await fileResponse.blob();

            // Create a temporary URL for the blob
            const blobUrl = window.URL.createObjectURL(blob);

            // Create a temporary link to trigger the download
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();

            // Clean up
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);

            // Show success message after download is triggered
            showSpinner(false);
            messageDiv.innerText = `${fileName} successfully downloaded`;
        } catch (error) {
            showSpinner(false);
            messageDiv.innerText = `Error downloading file: ${error.message}`;
        }
    })
    .catch(error => {
        showSpinner(false);
        messageDiv.innerText = `Error downloading file: ${error.message}`;
    });
}

async function loadFiles() {
    try {
        const response = await fetch('/files');
        const data = await response.json();

        if (data.error) {
            messageDiv.innerText = 'Error loading files: ' + data.error;
            return;
        }

        fileList.innerHTML = '';
        data.forEach(item => {
            const li = document.createElement('li');
            const fileNameSpan = document.createElement('span');
            fileNameSpan.textContent = item.Key;

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-container';

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-btn';
            deleteButton.addEventListener('click', () => deleteFile(item.Key));

            const downloadButton = document.createElement('button');
            downloadButton.textContent = 'Download';
            downloadButton.className = 'download-btn';
            downloadButton.addEventListener('click', () => downloadFile(item.Key));

            buttonContainer.appendChild(downloadButton);
            buttonContainer.appendChild(deleteButton);

            li.appendChild(fileNameSpan);
            li.appendChild(buttonContainer);
            fileList.appendChild(li);
        });
    } catch (error) {
        messageDiv.innerText = 'Error loading files: ' + error.message;
    }
}

// Load files on page load
loadFiles();