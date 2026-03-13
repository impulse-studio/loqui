import { CheckCircle, AlertCircle } from "lucide-react";

const toastIcons: Record<string, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: AlertCircle,
};

export default toastIcons;
