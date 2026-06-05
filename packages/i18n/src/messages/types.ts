import enUSActions from "../../messages/en-US/actions.json";
import enUSAuth from "../../messages/en-US/auth.json";
import enUSCommon from "../../messages/en-US/common.json";
import enUSDataTable from "../../messages/en-US/data-table.json";
import enUSNavigation from "../../messages/en-US/navigation.json";
import enUSPublicWeb from "../../messages/en-US/public-web.json";
import enUSValidation from "../../messages/en-US/validation.json";

export const MESSAGE_NAMESPACES = ["actions", "auth", "common", "data-table", "navigation", "public-web", "validation"] as const;

export type MessageNamespace = (typeof MESSAGE_NAMESPACES)[number];

export type LocaleMessages = {
  actions: typeof enUSActions;
  auth: typeof enUSAuth;
  common: typeof enUSCommon;
  "data-table": typeof enUSDataTable;
  navigation: typeof enUSNavigation;
  "public-web": typeof enUSPublicWeb;
  validation: typeof enUSValidation;
};

export type Messages = LocaleMessages;
