import { createContext, ReactNode, useContext, useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>()

  useEffect(() => {
    prevCartRef.current = cart
  })

  const prevCart = prevCartRef.current || cart

  const addProduct = async (productId: number) => {
    try {
      const currentProduct = cart.find(product => product.id === productId)

      const { data: currentStock } = await api.get<Stock>(`/stock/${productId}`)
        
      if (currentProduct) {
        const amount = currentProduct.amount + 1

        if (amount > currentStock.amount) {
          toast.error("Quantidade solicitada fora de estoque")
          return
        }

        setCart(state =>
          state.map(item => item.id !== productId ? item : ({
            ...item,
            amount: amount
          })
        ))
      } else {
        if (1 > currentStock.amount) {
          toast.error("Quantidade solicitada fora de estoque")
          return
        }

        const { data: product } = await api.get<Product>(`/products/${productId}`)
        
        if (!product) {
          throw new Error()
        }

        setCart(state => [
          ...state,
          {
            ...product,
            amount: 1
          }
        ])
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const currentProduct = cart.find(product => product.id === productId)

      if (!currentProduct) {
        throw new Error()
      }
      
      setCart(state => state.filter(item => item.id !== productId))
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return
      }

      const { data: currentStock } = await api.get<Stock>(`stock/${productId}`)

      if (amount > currentStock.amount) {
        toast.error("Quantidade solicitada fora de estoque")
        return
      }

      const currentProduct = cart.find(product => product.id === productId)

      if (!currentProduct) {
        throw new Error()
      }

      setCart(state =>
        state.map(item => item.id !== productId ? item : ({
          ...item,
          amount
        })
      ))

    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  useEffect(() => {
    if (prevCart !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart))
    }
  }, [prevCart, cart])

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
