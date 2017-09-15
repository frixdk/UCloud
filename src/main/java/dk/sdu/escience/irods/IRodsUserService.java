package dk.sdu.escience.irods;

import org.irods.jargon.core.exception.JargonException;
import org.jetbrains.annotations.NotNull;

import java.util.Arrays;
import java.util.Collections;

public class IRodsUserService {
    private final AccountServices internalServices;
    private final CommandExecutor cmd;
    private boolean open = true;

    IRodsUserService(AccountServices internalServices, CommandExecutor cmd) {
        this.internalServices = internalServices;
        this.cmd = cmd;
    }

    // TODO Exception for incorrect password
    // We re-query the password from the user here. We don't want to keep it around in memory, and it is a good
    // reminder for the UI layer to ask the user once again before changing the password.
    //
    // NOTE(dan): If you want to force change the password of a user you should use
    // IRodsAdminService#modifyUserPassword.
    public void modifyPassword(@NotNull String currentPassword, @NotNull String newPassword) {
        cmd.wrapCommand(internalServices, "modifyPassword", Collections.emptyList(), () -> {
            requireOpen();
            try {
                internalServices.getUsers().changeAUserPasswordByThatUser(internalServices.getAccount().getUserName(),
                        currentPassword, newPassword);
                return null;
            } catch (JargonException e) {
                throw new IRodsException(e);
            }
        });
    }

    void close() {
        open = false;
    }

    private void requireOpen() {
        if (!open) throw new IllegalStateException("The IRodsService instance has been closed prematurely!");
    }
}
