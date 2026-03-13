import Modal from "../../shared/components/modal";
import Button from "../../shared/components/button";

interface ConfirmDefaultModalProps {
  open: boolean;
  currentDefaultName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDefaultModal({
  open,
  currentDefaultName,
  onConfirm,
  onCancel,
}: ConfirmDefaultModalProps) {
  return (
    <Modal open={open} onClose={onCancel} title="Change Default Profile">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          This will replace <strong className="text-text-primary">{currentDefaultName}</strong> as
          the default profile. Continue?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}
