import { Modal, ModalProps, Button, Headline } from '@telegram-apps/telegram-ui';

import './ConfirmModal.css';

export type ConfirmModalProps = ModalProps & {
  title?: string;
  inProgress?: boolean;
  confirmText?: string;
  benefits?: string[];
  onClose?: () => void;
  onConfirm: () => void;
};

export const ConfirmModal = ({
  title,
  children,
  onConfirm,
  onClose,
  confirmText = 'Confirm',
  inProgress = false,
  onOpenChange,
  ...props
}: ConfirmModalProps) => {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose?.();
    }

    onOpenChange?.(open);
  };

  return (
    <Modal {...props} onOpenChange={handleOpenChange} className="ConfirmModal-root">
      <Modal.Header>{title}</Modal.Header>

      <Headline className="ConfirmModal-head">{title}</Headline>
      <div className="ConfirmModal-content">{children}</div>

      <Button stretched loading={inProgress} onClick={onConfirm}>
        {confirmText}
      </Button>
    </Modal>
  );
};
