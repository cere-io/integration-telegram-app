import { ReactNode } from 'react';

import closeIcon from './close-icon.svg';
import styles from './Modal.module.css';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  content: ReactNode;
};

export const Modal = ({ isOpen, onClose, content }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <button className={styles.modalCloseButton} onClick={onClose} aria-label="Close modal">
            <img src={closeIcon} alt="" />
          </button>
        </div>
        <div className={styles.modalContent}>{content}</div>
      </div>
    </div>
  );
};
