const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Cria um novo usuário no Firebase Auth e salva seus detalhes no Firestore.
 * Apenas administradores podem chamar esta função.
 */
exports.createUser = functions
    .region("southamerica-east1") // Mantendo sua região
    .https.onCall(async (data, context) => {
        // CORREÇÃO: Verificamos primeiro se 'context.auth' existe antes de checar o token.
        // Isso evita que a função quebre se for chamada por um usuário não logado.
        if (!context.auth || context.auth.token.admin !== true) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Apenas administradores podem criar novos usuários."
            );
        }

        const { email, password, nome, isAdmin, permissoes } = data;

        try {
            const userRecord = await admin.auth().createUser({
                email: email,
                password: password,
                displayName: nome,
            });

            await admin.auth().setCustomUserClaims(userRecord.uid, { admin: isAdmin });

            await admin.firestore().collection("users").doc(userRecord.uid).set({
                nome: nome,
                email: email,
                isAdmin: isAdmin,
                permissoes: permissoes || {},
            });

            return { result: `Usuário ${email} criado com sucesso.` };
        } catch (error) {
            console.error("Erro ao criar usuário:", error);
            throw new functions.https.HttpsError("internal", error.message);
        }
    });

/**
 * Atualiza os dados de um usuário existente no Firestore e seus claims no Auth.
 * Apenas administradores podem chamar esta função.
 */
exports.updateUser = functions
    .region("southamerica-east1") // Mantendo sua região
    .https.onCall(async (data, context) => {
        // CORREÇÃO: Verificação de segurança robustecida.
        if (!context.auth || context.auth.token.admin !== true) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Apenas administradores podem atualizar usuários."
            );
        }

        const { uid, nome, isAdmin, permissoes } = data;

        try {
            await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });

            await admin.firestore().collection("users").doc(uid).update({
                nome: nome,
                isAdmin: isAdmin,
                permissoes: permissoes || {},
            });

            return { result: `Usuário ${uid} atualizado com sucesso.` };
        } catch (error) {
            console.error("Erro ao atualizar usuário:", error);
            throw new functions.https.HttpsError("internal", error.message);
        }
    });
/**
 * Deleta um usuário do Firebase Auth e do Firestore.
 * Apenas administradores podem chamar esta função.
 */
exports.deleteUser = functions
    .region("southamerica-east1") // Mantendo sua região
    .https.onCall(async (data, context) => {
        // CORREÇÃO: Verificação de segurança robustecida.
        if (!context.auth || context.auth.token.admin !== true) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Apenas administradores podem deletar usuários."
            );
        }

        const { uid } = data;

        try {
            await admin.auth().deleteUser(uid);
            await admin.firestore().collection("users").doc(uid).delete();

            return { result: `Usuário ${uid} deletado com sucesso.` };
        } catch (error) {
            console.error("Erro ao deletar usuário:", error);
            throw new functions.https.HttpsError("internal", error.message);
        }
    });
