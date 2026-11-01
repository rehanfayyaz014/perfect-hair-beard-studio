"""Retrieve the local admin-auth database credential from Windows Credential Manager."""

from __future__ import annotations

import argparse
import ctypes
import getpass
import os
from ctypes import wintypes

from sqlalchemy.engine import URL

from app.core.config import get_settings

_TARGET = "PerfectHairBeardStudio/PostgreSQL/AdminAuth"
_USERNAME = "perfect_hair_beard_admin"
_CRED_TYPE_GENERIC = 1
_CRED_PERSIST_LOCAL_MACHINE = 2


class _Credential(ctypes.Structure):
    _fields_ = [
        ("Flags", wintypes.DWORD), ("Type", wintypes.DWORD),
        ("TargetName", wintypes.LPWSTR), ("Comment", wintypes.LPWSTR),
        ("LastWritten", wintypes.FILETIME), ("CredentialBlobSize", wintypes.DWORD),
        ("CredentialBlob", ctypes.POINTER(ctypes.c_ubyte)), ("Persist", wintypes.DWORD),
        ("AttributeCount", wintypes.DWORD), ("Attributes", ctypes.c_void_p),
        ("TargetAlias", wintypes.LPWSTR), ("UserName", wintypes.LPWSTR),
    ]


def _credential_api() -> ctypes.WinDLL:
    if os.name != "nt":
        raise RuntimeError("Windows Credential Manager is available only on Windows.")
    api = ctypes.WinDLL("Advapi32.dll", use_last_error=True)
    api.CredWriteW.argtypes = [ctypes.POINTER(_Credential), wintypes.DWORD]
    api.CredWriteW.restype = wintypes.BOOL
    api.CredReadW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.POINTER(ctypes.POINTER(_Credential))]
    api.CredReadW.restype = wintypes.BOOL
    api.CredFree.argtypes = [ctypes.c_void_p]
    api.CredFree.restype = None
    return api


def save_admin_credential() -> None:
    password = getpass.getpass("Admin-auth database password (hidden): ")
    confirmation = getpass.getpass("Re-enter password to confirm (hidden): ")
    if not password:
        raise ValueError("Password cannot be empty.")
    if password != confirmation:
        raise ValueError("Passwords did not match; no credential was saved.")
    password_bytes = password.encode("utf-16-le")
    if len(password_bytes) > 5120:
        raise ValueError("Password exceeds Windows Credential Manager's supported size.")
    blob = (ctypes.c_ubyte * len(password_bytes)).from_buffer_copy(password_bytes)
    credential = _Credential(
        Flags=0, Type=_CRED_TYPE_GENERIC, TargetName=_TARGET,
        Comment="Local Perfect Hair and Beard Studio admin-auth credential",
        CredentialBlobSize=len(password_bytes), CredentialBlob=ctypes.cast(blob, ctypes.POINTER(ctypes.c_ubyte)),
        Persist=_CRED_PERSIST_LOCAL_MACHINE, AttributeCount=0, Attributes=None,
        TargetAlias=None, UserName=_USERNAME,
    )
    if not _credential_api().CredWriteW(ctypes.byref(credential), 0):
        raise OSError(ctypes.get_last_error(), "Windows Credential Manager could not save the credential.")
    print("Admin-auth credential saved in Windows Credential Manager for this Windows user.")


def read_admin_credential() -> tuple[str, str]:
    api = _credential_api()
    credential_pointer = ctypes.POINTER(_Credential)()
    if not api.CredReadW(_TARGET, _CRED_TYPE_GENERIC, 0, ctypes.byref(credential_pointer)):
        raise RuntimeError(
            "Admin-auth credential is not available in Windows Credential Manager. "
            "Run `python -m app.core.admin_credentials setup` from the backend directory."
        )
    try:
        credential = credential_pointer.contents
        if credential.UserName != _USERNAME:
            raise RuntimeError("The saved Windows credential has an unexpected database role.")
        raw_password = ctypes.string_at(credential.CredentialBlob, credential.CredentialBlobSize)
        return credential.UserName, raw_password.decode("utf-16-le")
    finally:
        api.CredFree(credential_pointer)


def get_admin_database_url() -> URL:
    username, password = read_admin_credential()
    settings = get_settings()
    return URL.create(
        drivername="postgresql+psycopg", username=username, password=password,
        host=settings.postgres_host, port=settings.postgres_port, database=settings.postgres_db,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("setup",), help="Securely save the admin-auth password once")
    parser.parse_args()
    save_admin_credential()


if __name__ == "__main__":
    main()
