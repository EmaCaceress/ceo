import React from "react";
import "./LogoutModal.scss";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal = ({
  isOpen,
  onClose,
  onConfirm,
}: LogoutModalProps) => {
  if (!isOpen) return null;
console.log("LogoutModal renderizado");
  return (
    <div className="logout-modal-overlay">
      <div className="logout-modal">
        <h2>¿Seguro que querés cerrar sesión?</h2>

        <div className="logout-modal-buttons">
          <button
            className="cancel-btn"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            className="confirm-btn"
            onClick={onConfirm}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;