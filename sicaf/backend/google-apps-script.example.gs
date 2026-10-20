const FOLDER_ID = 'ISI_ID_FOLDER_GOOGLE_DRIVE';
const SHARED_SECRET = 'ganti-dengan-secret-random';
const MAKE_ANYONE_READER = false;

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');

    if (SHARED_SECRET && payload.shared_secret !== SHARED_SECRET) {
      return jsonOutput({
        ok: false,
        message: 'Unauthorized request',
      });
    }

    const action = String(payload.action || '');

    if (action === 'upload') {
      return handleUpload(payload);
    }

    if (action === 'delete') {
      return handleDelete(payload);
    }

    return jsonOutput({
      ok: false,
      message: 'Action tidak valid',
    });
  } catch (error) {
    return jsonOutput({
      ok: false,
      message: error.message || 'Terjadi kesalahan pada Google Apps Script',
    });
  }
}

function handleUpload(payload) {
  const fileName = String(payload.file_name || '').trim();
  const mimeType = String(payload.mime_type || 'application/octet-stream').trim();
  const contentBase64 = String(payload.content_base64 || '').trim();

  if (!fileName || !contentBase64) {
    return jsonOutput({
      ok: false,
      message: 'Payload upload tidak lengkap',
    });
  }

  const bytes = Utilities.base64Decode(contentBase64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const file = folder.createFile(blob);

  if (MAKE_ANYONE_READER) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  return jsonOutput({
    ok: true,
    file_id: file.getId(),
    file_name: file.getName(),
    file_url: file.getUrl(),
  });
}

function handleDelete(payload) {
  const fileId = String(payload.file_id || '').trim();

  if (!fileId) {
    return jsonOutput({
      ok: false,
      message: 'file_id wajib diisi',
    });
  }

  const file = DriveApp.getFileById(fileId);
  file.setTrashed(true);

  return jsonOutput({
    ok: true,
    message: 'File berhasil dipindahkan ke trash',
  });
}

function jsonOutput(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
