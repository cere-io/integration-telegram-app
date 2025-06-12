import './Modal.css';

import { CloseIcon } from '@tg-app/ui';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  content: React.ReactNode;
};

export const Modal = ({ isOpen, onClose, content }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="modal-close-button" onClick={onClose} aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>
        <div className="modal-content">{content}</div>
      </div>
    </div>
  );
};
