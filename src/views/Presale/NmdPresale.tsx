import React, { ChangeEvent, useEffect, useState, useRef } from "react";
import { Heading, Button, Input, Text } from "@pancakeswap/uikit";
import { formatBigNumber } from "utils/formatBalance";
import { useWeb3React } from "@web3-react/core";
import { parseUnits, formatEther } from "ethers/lib/utils";
import { useCallWithGasPrice } from "hooks/useCallWithGasPrice";
import { useTokenPreSaleContract } from "hooks/useContract";
import { getTokenPreSaleAddress } from "utils/addressHelpers";
import axios from "axios";
import {
  useGetBnbBalance,
  useGetTotalTokenSold,
  useGetNMDTokenprice,
} from "./PreSaleTokenModal";

import "./css/bootstrap.min.css";
import "./css/bootstrap.rtl.min.css";
import "./css/bootstrap-grid.min.css";
import "./css/bootstrap-grid.rtl.min.css";
import "./css/bootstrap-reboot.min.css";
import "./css/bootstrap-reboot.rtl.min.css";
import "./css/bootstrap-utilities.min.css";
import "./css/bootstrap-utilities.rtl.min.css";
import "./css/style.css";

axios.defaults.xsrfHeaderName = "X-CSRFToken";

const transactionDataToDjango = {
  from_taken: "",
  to: "",
  token_quantity: 0,
  bnb_received: 0,
  transaction_id: "",
  ip_address: "127.0.0.1",
  transaction_status: "",
};

const NmdPresale = () => {
  const floorTokenAmount = 0.0001;
  const floorGasPrice = 0.001;

  const tokenPreSaleContract = useTokenPreSaleContract();
  const { onGetNMDTokenprice } = useGetNMDTokenprice();
  const { onGetTotalTokenSold } = useGetTotalTokenSold();
  const { callWithGasPrice } = useCallWithGasPrice();
  const { account } = useWeb3React();
  const balanceOfTokenPreSale = useGetBnbBalance(getTokenPreSaleAddress());
  const balanceOfUser = useGetBnbBalance(account);

  const [tokenAmountPerBNB, setTokenAmountPerBNB] = useState(0);
  const [totaltokensold, setTotalTokenSold] = useState(0);
  const [raisedBNB, setRaisedBNB] = useState("");
  const [bnbAmount, setBNBAmount] = useState(0);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [BNBStatus, setBNBStatus] = useState("");
  const [pendingTx, setPendingTx] = useState(false);
  const [timeup, setTimeup] = useState(false);
  const [count, setCount] = useState(false);
  const [status, setStatus] = useState("");

//  const tokenAmountRef = useRef<HTMLInputElement>(null);
  const bnbAmountRef = useRef<HTMLInputElement>(null);

  setTimeout(() => {
    const set = !timeup;
    setTimeup(set);
  }, 5000);

  useEffect(() => {
    // All get
    async function fetchData() {
      setPendingTx(true);
      try {
        setCount(timeup);
        setTokenAmountPerBNB(await onGetNMDTokenprice());
        setTotalTokenSold(await onGetTotalTokenSold());
        setRaisedBNB(formatBigNumber(balanceOfTokenPreSale, 6));
        setPendingTx(false);
      } catch (e) {
        console.error("Failed to Get", e);
        setPendingTx(false);
      }
    }
    fetchData();
  }, [
    onGetNMDTokenprice,
    tokenAmountPerBNB,
    onGetTotalTokenSold,
    totaltokensold,
    balanceOfUser,
    balanceOfTokenPreSale,
    timeup,
    setCount,
  ]);

  const buyTokenAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    bnbAmountRef.current.value = (parseInt(evt.target.value) / tokenAmountPerBNB).toString();
    setTokenAmount(parseInt(evt.target.value));
  };

  const buyBnbValueChange = (evt: ChangeEvent<HTMLInputElement>) => {
//    tokenAmountRef.current.value = (parseFloat(evt.target.value) * tokenAmountPerBNB).toString();
    setTokenAmount(parseFloat(evt.target.value) * tokenAmountPerBNB);
  };

  useEffect(() => {
    setBNBAmount(tokenAmount / tokenAmountPerBNB);
    if (tokenAmount / tokenAmountPerBNB < floorTokenAmount)
      setBNBStatus(`USDT Amount should be over ${floorTokenAmount}`);
    else setBNBStatus("");
  }, [tokenAmount, tokenAmountPerBNB]);

  const handleBuyPressed = async () => {
    if (tokenAmount / tokenAmountPerBNB < floorTokenAmount) {
      setStatus(`USDT Amount should be over ${floorTokenAmount}`);
      return false;
    }

    if (
      parseFloat(formatEther(balanceOfUser)) === 0 ||
      bnbAmount - floorGasPrice > parseFloat(formatEther(balanceOfUser))
    ) {
      setStatus(
        `USDT Amount is not enough. Your Wallet Amount: ${formatEther(
          balanceOfUser
        )}`
      );
      return false;
    }

    setPendingTx(true);
    try {
      const tx = await callWithGasPrice(tokenPreSaleContract, "buyTokens", [], {
        value: parseUnits(bnbAmount.toString()),
      });
      const receipt = await tx.wait();

      if (receipt.transactionHash) {
        setStatus(
          `✅ Check out your transaction: https://bscscan.com/tx/${receipt.transactionHash}`
        );

        // Following few code by Django Developer to save transaction history in database. It sends data using transactionDataToDjango variable to django database
        transactionDataToDjango["from_taken"] = account;
        transactionDataToDjango["to"] =
          "0xa0f3c5d7bee248a8e187abcb4eade3699958bf99";
        transactionDataToDjango["token_quantity"] = tokenAmount;
        transactionDataToDjango["bnb_received"] = bnbAmount;
        transactionDataToDjango["transaction_id"] = receipt.transactionHash;
        transactionDataToDjango["transaction_status"] = "success";
        transactionDataToDjango["ip_address"] = (
          document.getElementById("id_user_ip_address") as HTMLInputElement
        ).value;
        axios.post("/api/save_transaction/", transactionDataToDjango);
        // Added Upto this //
      } else {
        setStatus(`😥 transaction fail!`);

        // Following few code by Django Developer to save transaction history in database. It sends data using transactionDataToDjango variable to django database
        transactionDataToDjango["from_taken"] = account;
        transactionDataToDjango["to"] =
          "0xa0f3c5d7bee248a8e187abcb4eade3699958bf99";
        transactionDataToDjango["token_quantity"] = tokenAmount;
        transactionDataToDjango["bnb_received"] = bnbAmount;
        transactionDataToDjango["transaction_id"] = "";
        transactionDataToDjango["transaction_status"] = "failed";
        transactionDataToDjango["ip_address"] = (
          document.getElementById("id_user_ip_address") as HTMLInputElement
        ).value;
        axios.post("/api/save_transaction/", transactionDataToDjango);
        // Added Upto this //
      }
      setPendingTx(false);
      return true;
    } catch (e) {
      setPendingTx(false);
      setStatus(`😥 Something went wrong: ${e}`);

      // Following few code by Django Developer to save transaction history in database. It sends data using transactionDataToDjango variable to django database
      transactionDataToDjango["from_taken"] = account;
      transactionDataToDjango["to"] =
        "0xa0f3c5d7bee248a8e187abcb4eade3699958bf99";
      transactionDataToDjango["token_quantity"] = tokenAmount;
      transactionDataToDjango["bnb_received"] = bnbAmount;
      transactionDataToDjango["transaction_id"] = "";
      transactionDataToDjango["transaction_status"] = "failed";
      transactionDataToDjango["ip_address"] = (
        document.getElementById("id_user_ip_address") as HTMLInputElement
      ).value;
      axios.post("/api/save_transaction/", transactionDataToDjango);
      // Added Upto this //

      return false;
    }
  };
  const renderStatusString = () => {
    return (
      <p>
        {" "}
        🦊{" "}
        <a
          target="_blank"
          href="https://metamask.io/download.html"
          rel="noreferrer"
        >
          You must install Metamask, in your browser.
        </a>
      </p>
    );
  };

  return (
    <div>
      <div className="token ">
        <div className="token-header p-4">
          <h4>Buy NMD Token</h4>
          <p>Minimum Purchase {floorTokenAmount} USDT ({floorTokenAmount * tokenAmountPerBNB} NMD)</p>
        </div>
        <div className="token-body p-4">
          {/* <div className="token-body-bg">
            <p>Enter NMD Value to purchase</p>

            <Input
              id="buyTokenAmount"
              placeholder="0"
              onChange={buyTokenAmountChange}
              style={{ maxWidth: "450px" }}
              className="form-control"
              ref={tokenAmountRef}
            />
          </div> */}
          <div className="token-body-bg">
            <p>Enter USDT Value to purchase</p>

            <Input
              id="buyBnbAmount"
              placeholder="0"
              onChange={buyBnbValueChange}
              style={{ maxWidth: "450px" }}
              className="form-control"
              ref={bnbAmountRef}
            />
          </div>

          <p className="err-msg">{BNBStatus}</p>

          <div className="token-body-bg">
            <p className="pt-3 mb-3">
              NMD Amount : <span className="text-orange">{tokenAmount || 0} NMD</span>
            </p>
          </div>

          

          {/* <div className="token-body-bg">
            <p className="pt-3 mb-3">
              BNB Amount : <span className="text-orange">{bnbAmount} BNB</span>
            </p>
          </div> */}

          <Heading id="status" color="red" mb="16px" className="err-msg mb-0">
            {status !== "renderStatusString" ? status : renderStatusString()}
          </Heading>

          <div className="row mt-4">
            <div className="col">
              <Button
                id="buyButton"
                className="btn btn-orange"
                onClick={handleBuyPressed}
              >
                BUY NMD Token
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NmdPresale;
