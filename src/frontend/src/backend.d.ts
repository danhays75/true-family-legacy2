import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface FamilyRecord {
    createdAt: bigint;
    parentFamilyId?: string;
    familyId: string;
    rootName: string;
    canisterId: Principal;
}
export interface EdgeRecord {
    kind: EdgeKind;
    toFamilyId: string;
    viaPersonName: string;
    fromFamilyId: string;
}
export enum EdgeKind {
    childOf = "childOf",
    spouseOriginOf = "spouseOriginOf"
}
export interface backendInterface {
    /**
     * / Add a relationship edge between two existing families.
     */
    linkFamilies(fromFamilyId: string, toFamilyId: string, kind: EdgeKind, viaPersonName: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Return all relationship edges.
     */
    listEdges(): Promise<Array<EdgeRecord>>;
    /**
     * / Return all registered family records.
     */
    listFamilies(): Promise<Array<FamilyRecord>>;
    /**
     * / Call the child canister's whoAmI() and return its response.
     */
    pingChild(familyId: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    /**
     * / Create a new child Family canister, fund it, register it, and optionally
     * / add a #childOf edge to the parent family.
     */
    plantTree(rootName: string, parentFamilyId: string | null): Promise<{
        __kind__: "ok";
        ok: [string, Principal];
    } | {
        __kind__: "err";
        err: string;
    }>;
}
