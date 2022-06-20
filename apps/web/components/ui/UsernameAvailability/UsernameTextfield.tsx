import { CheckIcon, PencilAltIcon, XIcon } from "@heroicons/react/solid";
import classNames from "classnames";
import { debounce } from "lodash";
import { MutableRefObject, useCallback, useEffect, useState } from "react";

import { fetchUsername } from "@calcom/lib/fetchUsername";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogHeader } from "@calcom/ui/Dialog";
import { Input, Label } from "@calcom/ui/form/fields";

import { trpc } from "@lib/trpc";

import { AppRouter } from "@server/routers/_app";
import { TRPCClientErrorLike } from "@trpc/client";

export enum UsernameChangeStatusEnum {
  NORMAL = "NORMAL",
  UPGRADE = "UPGRADE",
  DOWNGRADE = "DOWNGRADE",
}

interface ICustomUsernameProps {
  currentUsername: string | undefined;
  setCurrentUsername: (value: string | undefined) => void;
  inputUsernameValue: string | undefined;
  usernameRef: MutableRefObject<HTMLInputElement>;
  setInputUsernameValue: (value: string) => void;
  onSuccessMutation?: () => void;
  onErrorMutation?: (error: TRPCClientErrorLike<AppRouter>) => void;
}

const UsernameTextfield = (props: ICustomUsernameProps) => {
  const { t } = useLocale();
  const {
    currentUsername,
    setCurrentUsername,
    inputUsernameValue,
    setInputUsernameValue,
    usernameRef,
    onSuccessMutation,
    onErrorMutation,
  } = props;
  const [usernameIsAvailable, setUsernameIsAvailable] = useState(false);
  const [markAsError, setMarkAsError] = useState(false);
  const [openDialogSaveUsername, setOpenDialogSaveUsername] = useState(false);

  const debouncedApiCall = useCallback(
    debounce(async (username) => {
      const { data } = await fetchUsername(username);
      setMarkAsError(!data.available);
      setUsernameIsAvailable(data.available);
    }, 150),
    []
  );

  useEffect(() => {
    if (currentUsername !== inputUsernameValue) {
      debouncedApiCall(inputUsernameValue);
    } else if (inputUsernameValue === "") {
      setMarkAsError(false);
      setUsernameIsAvailable(false);
    } else {
      setUsernameIsAvailable(false);
    }
  }, [inputUsernameValue]);

  const utils = trpc.useContext();

  const updateUsername = trpc.useMutation("viewer.updateProfile", {
    onSuccess: async () => {
      onSuccessMutation && (await onSuccessMutation());
      setCurrentUsername(inputUsernameValue);
      setOpenDialogSaveUsername(false);
    },
    onError: (error) => {
      onErrorMutation && onErrorMutation(error);
    },
    async onSettled() {
      await utils.invalidateQueries(["viewer.i18n"]);
    },
  });

  const ActionButtons = (props: { index: string }) => {
    const { index } = props;
    return usernameIsAvailable && currentUsername !== inputUsernameValue ? (
      <div className="flex flex-row">
        <Button
          type="button"
          className="mx-2"
          onClick={() => setOpenDialogSaveUsername(true)}
          data-testid={`update-username-btn-${index}`}>
          {t("update")}
        </Button>
        <Button
          type="button"
          color="minimal"
          className="mx-2"
          onClick={() => {
            if (currentUsername) {
              setInputUsernameValue(currentUsername);
              usernameRef.current.value = currentUsername;
            }
          }}>
          {t("cancel")}
        </Button>
      </div>
    ) : (
      <></>
    );
  };

  return (
    <>
      <div style={{ display: "flex", justifyItems: "center" }}>
        <Label htmlFor={"username"}>{t("username")}</Label>
      </div>
      <div className="mt-1 flex rounded-md shadow-sm">
        <span
          className={classNames(
            "inline-flex items-center rounded-l-sm border border-gray-300 bg-gray-50 px-3 text-sm text-gray-500"
          )}>
          {process.env.NEXT_PUBLIC_WEBSITE_URL}/
        </span>
        <div style={{ position: "relative", width: "100%" }}>
          <Input
            ref={usernameRef}
            name={"username"}
            autoComplete={"none"}
            autoCapitalize={"none"}
            autoCorrect={"none"}
            className={classNames(
              "mt-0 rounded-l-none",
              markAsError
                ? "focus:shadow-0 focus:ring-shadow-0 border-red-500 focus:border-red-500 focus:outline-none focus:ring-0"
                : ""
            )}
            defaultValue={currentUsername}
            onChange={(event) => setInputUsernameValue(event.target.value)}
            data-testid="username-input"
          />
          {currentUsername !== inputUsernameValue && (
            <div
              className="top-0"
              style={{
                position: "absolute",
                right: 2,
                display: "flex",
                flexDirection: "row",
              }}>
              <span className={classNames("mx-2 py-1")}>
                {usernameIsAvailable ? <CheckIcon className="mt-[4px] w-6" /> : <></>}
              </span>
            </div>
          )}
        </div>
        <div className="xs:hidden">
          <ActionButtons index="desktop" />
        </div>
      </div>
      {markAsError && <p className="mt-1 text-xs text-red-500">Username is already taken</p>}

      {usernameIsAvailable && currentUsername !== inputUsernameValue && (
        <div className="mt-2 flex justify-end md:hidden">
          <ActionButtons index="mobile" />
        </div>
      )}
      <Dialog open={openDialogSaveUsername}>
        <DialogContent>
          <DialogClose asChild>
            <div className="fixed top-1 right-1 flex h-8 w-8 justify-center rounded-full hover:bg-gray-200">
              <XIcon className="w-4" />
            </div>
          </DialogClose>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <div className="xs:hidden flex h-10 w-10 flex-shrink-0 justify-center rounded-full bg-[#FAFAFA]">
              <PencilAltIcon className="m-auto h-6 w-6"></PencilAltIcon>
            </div>
            <div className="mb-4 w-full px-4 pt-1">
              <DialogHeader title={t("confirm_username_change_dialog_title")} />

              <div className="flex w-full flex-row rounded-sm bg-gray-100 py-3 text-sm">
                <div className="px-2">
                  <p className="text-gray-500">
                    {t("current")} {t("username")}
                  </p>
                  <p className="mt-1" data-testid="current-username">
                    {currentUsername}
                  </p>
                </div>
                <div className="ml-6">
                  <p className="text-gray-500" data-testid="new-username">
                    {t("new")} {t("username")}
                  </p>
                  <p>{inputUsernameValue}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-500">{t("more_info_premium_username")}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-row-reverse gap-x-2">
            <Button
              type="button"
              loading={updateUsername.isLoading}
              data-testid="save-username"
              onClick={() => {
                updateUsername.mutate({
                  username: inputUsernameValue,
                });
              }}>
              {t("save")}
            </Button>

            <DialogClose asChild>
              <Button color="secondary" onClick={() => setOpenDialogSaveUsername(false)}>
                {t("cancel")}
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { UsernameTextfield };