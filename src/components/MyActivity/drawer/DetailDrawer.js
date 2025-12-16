// ======================================================================
// DetailDrawer.jsx — Drawer Router (FREE / PREMIUM / LISTING)
// Mobile-First • Swipe Down Close • Role-Aware
// ======================================================================

import React from "react";
import DrawerWrapper from "./DrawerWrapper";

import DetailDrawerFree from "./DetailDrawerFree";
import DetailDrawerPremium from "./DetailDrawerPremium";
import DetailDrawerListing from "./DetailDrawerListing";

export default function DetailDrawer({
  open,
  item,
  type,          // "request" | "purchase" | "listing"
  viewerRole,     // "buyer" | "seller" | "guest"
  currentUser,
  loadingStates,
  onClose,

  // global actions
  onDelete,
  onRelist,

  // free actions
  onAcceptAward,
  onDeclineAward,
  onConfirmFreeDelivery,   // buyer confirm
  onSellerFreeConfirm,     // seller confirm

  // premium actions
  onPremiumAction,         // buyer actions (cancel, confirm)
  onSellerPremiumConfirm,  // seller handshake confirm
}) {

  return (
    <DrawerWrapper open={open} onClose={onClose}>
      {!item ? (
        <div className="p-6 text-center text-gray-500">Loading…</div>
      ) : type === "request" ? (
        <DetailDrawerFree
          item={item}
          viewerRole={viewerRole}
          currentUser={currentUser}
          loadingStates={loadingStates}
          onClose={onClose}
          onAcceptAward={onAcceptAward}
          onDeclineAward={onDeclineAward}
          onConfirmFreeDelivery={onConfirmFreeDelivery}
          onSellerFreeConfirm={onSellerFreeConfirm}
          onDelete={onDelete}
        />
      ) : type === "purchase" ? (
        <DetailDrawerPremium
          item={item}
          viewerRole={viewerRole}
          currentUser={currentUser}
          loadingStates={loadingStates}
          onClose={onClose}
          onPremiumAction={onPremiumAction}
          onSellerPremiumConfirm={onSellerPremiumConfirm}
          onDelete={onDelete}
        />
      ) : (
        <DetailDrawerListing
          item={item}
          viewerRole={viewerRole}
          currentUser={currentUser}
          loadingStates={loadingStates}
          onClose={onClose}
          onRelist={onRelist}
          onDelete={onDelete}
        />
      )}
    </DrawerWrapper>
  );
}
